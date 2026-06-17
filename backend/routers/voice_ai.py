"""Phase 4 — Real-time Voice AI WebSocket endpoint.

Flow:
  Browser (mic audio) → WebSocket /api/voice-ai/ws/{lead_id}
    → Deepgram STT (streaming, optional — falls back to manual transcript)
    → RAG Agent (context + DeepSeek analysis)
    → WebSocket back to browser (live transcript + suggestions)

Also provides:
  POST /api/voice-ai/transcribe/{lead_id}  — upload complete audio clip
  GET  /api/voice-ai/status                — check Deepgram + DeepSeek config
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
from auth_utils import decode_token

logger = logging.getLogger("facets.voice_ai")
router = APIRouter(prefix="/voice-ai", tags=["voice-ai"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _auth_user_id(token: str) -> Optional[int]:
    """Decode JWT and return user_id, or None if invalid."""
    try:
        payload = decode_token(token)
        return int(payload.get("sub", 0))
    except Exception:
        return None


def _detect_sentiment(suggestions: dict) -> str:
    score = suggestions.get("lead_score", 50)
    if score >= 70:
        return "Positive"
    elif score >= 40:
        return "Neutral"
    return "Negative"


# ── Status endpoint ───────────────────────────────────────────────────────────

@router.get("/status")
def status():
    return {
        "deepgram_configured": deepgram_stt.is_configured(),
        "rag_ready": True,
    }


# ── REST transcription (upload complete audio file) ───────────────────────────

@router.post("/transcribe/{lead_id}")
async def transcribe_upload(
    lead_id: int,
    audio: UploadFile = File(...),
    save_call: bool = True,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """Upload a complete audio recording → Deepgram STT → RAG analysis."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    audio_bytes = await audio.read()

    # Save audio file to recordings folder
    try:
        import os
        os.makedirs("recordings", exist_ok=True)
        ext = "webm"
        if audio.filename and "." in audio.filename:
            ext = audio.filename.split(".")[-1]
        filename = f"recordings/lead_{lead_id}_{int(time.time())}.{ext}"
        with open(filename, "wb") as f:
            f.write(audio_bytes)
        logger.info("Saved REST upload recording to %s", filename)
    except Exception as e:
        logger.error("Failed to save REST uploaded audio: %s", e)

    mimetype = audio.content_type or "audio/webm"
    try:
        transcript_text = deepgram_stt.transcribe_bytes(audio_bytes, mimetype=mimetype)
    except deepgram_stt.DeepgramNotConfigured as e:
        raise HTTPException(503, str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"STT error: {e}")

    transcript_lines = [ln.strip() for ln in transcript_text.splitlines() if ln.strip()]
    context = rag_agent.build_context(lead_id, db)
    suggestions = rag_agent.analyse_with_rag(lead_id, db, transcript_lines, context=context)

    if save_call and transcript_text:
        call = Call(
            lead_id=lead_id,
            call_status="Completed",
            call_summary=(
                f"In-store voice (AI transcribed): "
                f"{transcript_lines[0][:100] if transcript_lines else ''}"
            ),
            call_duration=max(30, len(transcript_text) // 10),
            transcript=transcript_text,
            sentiment=_detect_sentiment(suggestions),
        )
        db.add(call)
        db.add(Activity(
            lead_id=lead_id,
            activity_type="Call",
            description=(
                f"In-store conversation recorded and AI-analysed. "
                f"Score: {suggestions.get('lead_score', '?')}/100"
            ),
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

    Client → sends binary audio chunks (webm/opus from MediaRecorder)
    Client → sends JSON {"type": "stop"} to end session
    Server → sends:
      {"type": "ready"}
      {"type": "transcript", "text": "...", "is_final": bool, "speaker": int|null}
      {"type": "suggestion", "data": {...}}
      {"type": "session_saved", "call_id": int}
      {"type": "error", "message": "..."}
    """
    await websocket.accept()

    # ── JWT auth ──────────────────────────────────────────────────────────────
    if not token:
        await websocket.send_json({"type": "error", "message": "Auth token required"})
        await websocket.close(code=4001)
        return

    user_id = _auth_user_id(token)
    if not user_id:
        await websocket.send_json({"type": "error", "message": "Invalid or expired token"})
        await websocket.close(code=4001)
        return

    # ── Lead check ────────────────────────────────────────────────────────────
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        await websocket.send_json({"type": "error", "message": f"Lead #{lead_id} not found"})
        await websocket.close(code=4004)
        return

    logger.info("Voice AI WS connected — lead=%d user=%d", lead_id, user_id)

    # ── Pre-fetch RAG context ─────────────────────────────────────────────────
    context = rag_agent.build_context(lead_id, db)

    # ── Session state ─────────────────────────────────────────────────────────
    transcript_lines: list[str] = []
    full_transcript_parts: list[str] = []
    last_suggestion_time = 0.0
    SUGGESTION_DEBOUNCE = 8.0  # seconds — don't spam DeepSeek
    audio_chunks: list[bytes] = []

    # ── Deepgram streaming setup ──────────────────────────────────────────────
    audio_queue: asyncio.Queue = asyncio.Queue()
    stop_event = asyncio.Event()
    deepgram_available = deepgram_stt.is_configured()

    async def on_transcript(text: str, is_final: bool, speaker: Optional[int]):
        nonlocal last_suggestion_time

        if speaker is not None:
            label = "Customer" if speaker == 0 else "Salesperson"
            labelled = f"{label}: {text}"
        else:
            labelled = text

        # Send transcript to browser
        try:
            await websocket.send_json({
                "type": "transcript",
                "text": labelled,
                "raw_text": text,
                "is_final": is_final,
                "speaker": speaker,
            })
        except Exception:
            return  # websocket already closed

        if is_final and text.strip():
            full_transcript_parts.append(labelled)
            transcript_lines.append(labelled)

            # Debounced RAG + DeepSeek analysis
            now = time.time()
            if now - last_suggestion_time >= SUGGESTION_DEBOUNCE:
                last_suggestion_time = now
                try:
                    suggestions = rag_agent.analyse_with_rag(
                        lead_id, db, list(transcript_lines), context=context
                    )
                    await websocket.send_json({"type": "suggestion", "data": suggestions})
                except Exception as e:  # noqa: BLE001
                    logger.warning("RAG error during voice session: %s", e)

    # Start Deepgram streaming task (or a no-op task if not configured)
    if deepgram_available:
        deepgram_task = asyncio.create_task(
            deepgram_stt.stream_transcribe(
                audio_queue,
                on_transcript=on_transcript,
                stop_event=stop_event,
            )
        )
    else:
        # No Deepgram — inform browser but stay connected (manual transcript still works)
        async def _noop():
            await stop_event.wait()

        deepgram_task = asyncio.create_task(_noop())

    # Signal browser that backend is ready
    await websocket.send_json({
        "type": "ready",
        "deepgram": deepgram_available,
        "message": (
            "Listening… start speaking."
            if deepgram_available
            else "Deepgram not configured — add DEEPGRAM_API_KEY to .env for live STT. "
                 "You can still type messages manually in the session."
        ),
    })

    # ── Main receive loop ─────────────────────────────────────────────────────
    try:
        while True:
            message = await websocket.receive()

            if message.get("type") == "websocket.disconnect":
                break

            # Binary audio chunk → Deepgram
            raw_bytes = message.get("bytes")
            if raw_bytes:
                audio_chunks.append(raw_bytes)
                if deepgram_available:
                    await audio_queue.put(raw_bytes)
                continue

            # JSON control messages
            raw_text = message.get("text")
            if not raw_text:
                continue

            try:
                data = json.loads(raw_text)
            except Exception:
                continue

            msg_type = data.get("type")

            if msg_type == "stop":
                # ── Session end — save to DB ──────────────────────────────
                stop_event.set()
                await audio_queue.put(None)

                # Save audio file to recordings folder if we got any binary data
                if audio_chunks:
                    try:
                        import os
                        os.makedirs("recordings", exist_ok=True)
                        filename = f"recordings/lead_{lead_id}_{int(time.time())}.webm"
                        with open(filename, "wb") as f:
                            f.write(b"".join(audio_chunks))
                        logger.info("Saved websocket recording to %s", filename)
                    except Exception as e:
                        logger.error("Failed to save websocket audio: %s", e)

                full_transcript = "\n".join(full_transcript_parts)
                call_id = None

                if full_transcript.strip():
                    call = Call(
                        lead_id=lead_id,
                        call_status="Completed",
                        call_summary=(
                            f"In-store voice AI session. "
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
                    try:
                        db.commit()
                        db.refresh(call)
                        call_id = call.id
                    except Exception as e:
                        logger.error("DB commit error: %s", e)

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

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        logger.info("Voice AI WS disconnected — lead=%d", lead_id)
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
        logger.info("Voice AI WS session closed — lead=%d", lead_id)
