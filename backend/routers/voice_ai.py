"""Phase 4 — Real-time Voice AI WebSocket endpoint.

Flow:
  Browser (mic audio) → WebSocket /api/voice-ai/ws/{session_id}
    → Deepgram STT (streaming transcription)
    → RAG Agent (context + DeepSeek analysis)
    → WebSocket back to browser (live transcript + suggestions)

Also provides:
  POST /api/voice-ai/transcribe  — upload a complete audio clip for REST transcription
  GET  /api/voice-ai/status      — check Deepgram + DeepSeek config
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
from deps import get_current_user
from models import Call, Lead, Activity, User
from services import deepgram_stt, rag_agent

logger = logging.getLogger("facets.voice_ai")
router = APIRouter(prefix="/voice-ai", tags=["voice-ai"])


# ── Status endpoint ───────────────────────────────────────────────────────────

@router.get("/status")
def status():
    return {
        "deepgram_configured": deepgram_stt.is_configured(),
        "rag_ready": True,
    }


# ── REST transcription (upload complete audio) ────────────────────────────────

@router.post("/transcribe/{lead_id}")
async def transcribe_upload(
    lead_id: int,
    audio: UploadFile = File(...),
    save_call: bool = True,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """Upload a complete audio recording → Deepgram STT → RAG analysis.

    Returns: transcript, speaker-labelled text, AI suggestions
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    audio_bytes = await audio.read()
    mimetype = audio.content_type or "audio/webm"

    # STT
    try:
        transcript_text = deepgram_stt.transcribe_bytes(audio_bytes, mimetype=mimetype)
    except deepgram_stt.DeepgramNotConfigured as e:
        raise HTTPException(503, str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"STT error: {e}")

    # Split into lines for RAG
    transcript_lines = [l.strip() for l in transcript_text.splitlines() if l.strip()]

    # RAG analysis
    context = rag_agent.build_context(lead_id, db)
    suggestions = rag_agent.analyse_with_rag(lead_id, db, transcript_lines, context=context)

    # Optionally save as a call log
    if save_call and transcript_text:
        duration_secs = max(30, len(transcript_text) // 10)  # estimate
        call = Call(
            lead_id=lead_id,
            call_status="Completed",
            call_summary=f"In-store conversation (AI transcribed): {transcript_lines[0][:100] if transcript_lines else ''}",
            call_duration=duration_secs,
            transcript=transcript_text,
            sentiment=_detect_sentiment(suggestions),
        )
        db.add(call)
        db.add(Activity(
            lead_id=lead_id,
            activity_type="Call",
            description=f"In-store conversation recorded and AI-analysed. Score: {suggestions.get('lead_score', '?')}/100",
            created_by=me.id,
        ))
        db.commit()
        db.refresh(call)
        suggestions["call_id"] = call.id

    return {
        "transcript": transcript_text,
        "transcript_lines": transcript_lines,
        "suggestions": suggestions,
    }


# ── WebSocket streaming endpoint ──────────────────────────────────────────────

@router.websocket("/ws/{lead_id}")
async def voice_ws(
    websocket: WebSocket,
    lead_id: int,
    token: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Real-time voice AI WebSocket.

    Protocol:
      Client → sends binary audio chunks (webm/opus from MediaRecorder)
      Client → sends JSON {"type": "stop"} to end session
      Server → sends JSON messages:
        {"type": "transcript", "text": "...", "is_final": bool, "speaker": int|null}
        {"type": "suggestion", "data": {...}}   — after each final utterance
        {"type": "error", "message": "..."}
        {"type": "ready"}
        {"type": "session_saved", "call_id": int}
    """
    await websocket.accept()

    # Auth check (token from query param)
    if not token:
        await websocket.send_json({"type": "error", "message": "Auth token required"})
        await websocket.close(code=4001)
        return

    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        await websocket.send_json({"type": "error", "message": "Lead not found"})
        await websocket.close(code=4004)
        return

    logger.info("Voice AI WS connected for lead=%d", lead_id)

    # Pre-fetch RAG context once (reuse across transcript updates)
    context = rag_agent.build_context(lead_id, db)

    # Accumulated transcript
    transcript_lines: list[str] = []
    full_transcript_parts: list[str] = []
    last_suggestion_time = 0.0
    SUGGESTION_DEBOUNCE = 8.0  # seconds between RAG calls

    # Audio queue for Deepgram streaming
    audio_queue: asyncio.Queue = asyncio.Queue()
    stop_event = asyncio.Event()

    async def on_transcript(text: str, is_final: bool, speaker: Optional[int]):
        nonlocal last_suggestion_time

        # Label speaker
        if speaker is not None:
            label = "Customer" if speaker == 0 else "Salesperson"
            labelled = f"{label}: {text}"
        else:
            labelled = text

        # Send transcript chunk to browser
        await websocket.send_json({
            "type": "transcript",
            "text": labelled,
            "raw_text": text,
            "is_final": is_final,
            "speaker": speaker,
        })

        if is_final and text.strip():
            full_transcript_parts.append(labelled)
            transcript_lines.append(labelled)

            # Debounced RAG call — don't call on every word
            now = time.time()
            if now - last_suggestion_time >= SUGGESTION_DEBOUNCE:
                last_suggestion_time = now
                try:
                    suggestions = rag_agent.analyse_with_rag(
                        lead_id, db, list(transcript_lines), context=context
                    )
                    await websocket.send_json({
                        "type": "suggestion",
                        "data": suggestions,
                    })
                except Exception as e:  # noqa: BLE001
                    logger.warning("RAG error during voice session: %s", e)

    # Start Deepgram streaming in background
    deepgram_task = asyncio.create_task(
        deepgram_stt.stream_transcribe(
            audio_queue,
            on_transcript=on_transcript,
            stop_event=stop_event,
        )
    )

    await websocket.send_json({"type": "ready"})

    try:
        while True:
            message = await websocket.receive()

            # Binary audio chunk from browser
            if message.get("type") == "websocket.receive":
                if "bytes" in message and message["bytes"]:
                    await audio_queue.put(message["bytes"])

                elif "text" in message and message["text"]:
                    try:
                        data = json.loads(message["text"])
                    except Exception:
                        continue

                    if data.get("type") == "stop":
                        # Session ended — save to DB and send final suggestion
                        await audio_queue.put(None)
                        stop_event.set()

                        full_transcript = "\n".join(full_transcript_parts)
                        call_id = None

                        if full_transcript.strip():
                            try:
                                # Get auth user from token
                                from auth_utils import decode_token
                                payload = decode_token(token)
                                user_id = int(payload.get("sub", 0)) if payload else None
                            except Exception:
                                user_id = None

                            call = Call(
                                lead_id=lead_id,
                                call_status="Completed",
                                call_summary=(
                                    f"In-store voice conversation (AI transcribed). "
                                    f"{len(full_transcript_parts)} utterances."
                                ),
                                call_duration=max(30, len(full_transcript) // 8),
                                transcript=full_transcript,
                            )
                            db.add(call)
                            db.add(Activity(
                                lead_id=lead_id,
                                activity_type="Call",
                                description="In-store voice AI session completed.",
                                created_by=user_id,
                            ))
                            db.commit()
                            db.refresh(call)
                            call_id = call.id

                            # Final RAG analysis
                            try:
                                final_suggestions = rag_agent.analyse_with_rag(
                                    lead_id, db, list(transcript_lines), context=context
                                )
                                await websocket.send_json({
                                    "type": "suggestion",
                                    "data": final_suggestions,
                                    "is_final": True,
                                })
                            except Exception as e:  # noqa: BLE001
                                logger.warning("Final RAG error: %s", e)

                        await websocket.send_json({
                            "type": "session_saved",
                            "call_id": call_id,
                            "transcript_lines": len(full_transcript_parts),
                        })
                        break

    except WebSocketDisconnect:
        logger.info("Voice AI WS disconnected for lead=%d", lead_id)
    except Exception as e:
        logger.error("Voice AI WS error: %s", e)
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        stop_event.set()
        await audio_queue.put(None)
        deepgram_task.cancel()
        try:
            await deepgram_task
        except asyncio.CancelledError:
            pass
        logger.info("Voice AI WS session closed for lead=%d", lead_id)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _detect_sentiment(suggestions: dict) -> str:
    score = suggestions.get("lead_score", 50)
    if score >= 70:
        return "Positive"
    elif score >= 40:
        return "Neutral"
    return "Negative"
