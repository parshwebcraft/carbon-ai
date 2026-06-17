"""Deepgram real-time Speech-to-Text (STT) streaming client.

Uses Deepgram's WebSocket streaming API (nova-2 model) to transcribe
audio chunks in real-time. Falls back gracefully if key is missing.

Env var: DEEPGRAM_API_KEY
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import AsyncGenerator

import httpx

logger = logging.getLogger("facets.deepgram")

DEEPGRAM_BASE = "wss://api.deepgram.com/v1/listen"
DEEPGRAM_REST = "https://api.deepgram.com/v1/listen"


class DeepgramNotConfigured(RuntimeError):
    pass


def _key() -> str:
    k = os.environ.get("DEEPGRAM_API_KEY", "").strip()
    if not k:
        raise DeepgramNotConfigured(
            "DEEPGRAM_API_KEY is not set. Add it to /app/backend/.env. "
            "Get a free key at https://deepgram.com"
        )
    return k


def is_configured() -> bool:
    return bool(os.environ.get("DEEPGRAM_API_KEY", "").strip())


# ── Streaming WebSocket URL builder ─────────────────────────────────────────

def _stream_url(
    *,
    model: str = "nova-2",
    language: str = "hi-en",      # Hindi+English code-switching (Indian jewellery stores)
    punctuate: bool = True,
    diarize: bool = True,          # Speaker labels: Customer vs Salesperson
    smart_format: bool = True,
    interim_results: bool = True,
    utterance_end_ms: int = 1000,
) -> str:
    params = (
        f"model={model}&language={language}"
        f"&punctuate={str(punctuate).lower()}"
        f"&diarize={str(diarize).lower()}"
        f"&smart_format={str(smart_format).lower()}"
        f"&interim_results={str(interim_results).lower()}"
        f"&utterance_end_ms={utterance_end_ms}"
        f"&encoding=webm-opus"      # Browser MediaRecorder default
        f"&channels=1"
        f"&sample_rate=48000"
    )
    return f"{DEEPGRAM_BASE}?{params}"


# ── REST transcription (for short clips / uploads) ───────────────────────────

def transcribe_bytes(audio_bytes: bytes, *, mimetype: str = "audio/webm") -> str:
    """Synchronously transcribe a complete audio clip and return the transcript text."""
    key = _key()
    url = (
        f"{DEEPGRAM_REST}?model=nova-2&language=hi-en"
        "&punctuate=true&diarize=true&smart_format=true"
    )
    with httpx.Client(timeout=60.0) as client:
        r = client.post(
            url,
            headers={
                "Authorization": f"Token {key}",
                "Content-Type": mimetype,
            },
            content=audio_bytes,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"Deepgram REST error {r.status_code}: {r.text[:300]}")
        data = r.json()

    results = data.get("results", {})
    channels = results.get("channels", [{}])
    alternatives = channels[0].get("alternatives", [{}])
    transcript = alternatives[0].get("transcript", "")

    # Try to get diarized words for speaker labels
    words = alternatives[0].get("words", [])
    if words and any(w.get("speaker") is not None for w in words):
        return _format_diarized(words)
    return transcript


def _format_diarized(words: list[dict]) -> str:
    """Convert diarized word list into 'Speaker N: sentence' format."""
    lines = []
    current_speaker = None
    current_words: list[str] = []

    for word in words:
        spk = word.get("speaker", 0)
        text = word.get("punctuated_word") or word.get("word", "")
        if spk != current_speaker:
            if current_speaker is not None and current_words:
                label = "Customer" if current_speaker == 0 else "Salesperson"
                lines.append(f"{label}: {' '.join(current_words)}")
            current_speaker = spk
            current_words = [text]
        else:
            current_words.append(text)

    if current_words and current_speaker is not None:
        label = "Customer" if current_speaker == 0 else "Salesperson"
        lines.append(f"{label}: {' '.join(current_words)}")

    return "\n".join(lines)


# ── Async streaming transcription ────────────────────────────────────────────

async def stream_transcribe(
    audio_queue: asyncio.Queue,
    *,
    on_transcript,          # async callable(text: str, is_final: bool, speaker: int | None)
    stop_event: asyncio.Event,
) -> None:
    """
    Consume audio chunks from `audio_queue` and stream them to Deepgram.
    Calls `on_transcript(text, is_final, speaker)` for each result.

    `audio_queue` items should be `bytes` (raw audio chunks).
    Put `None` into the queue to signal end-of-stream.
    """
    try:
        key = _key()
    except DeepgramNotConfigured as e:
        logger.warning("Deepgram not configured: %s", e)
        await on_transcript("[Deepgram not configured — add DEEPGRAM_API_KEY to .env]", True, None)
        return

    try:
        import websockets  # type: ignore
    except ImportError:
        logger.error("websockets package not installed. Run: pip install websockets")
        await on_transcript("[websockets package missing]", True, None)
        return

    url = _stream_url()
    headers = {"Authorization": f"Token {key}"}

    async def _run(ws):
        logger.info("Deepgram WS connected")
        async def _send():
            """Read audio queue and send chunks to Deepgram."""
            while not stop_event.is_set():
                try:
                    chunk = await asyncio.wait_for(audio_queue.get(), timeout=0.5)
                except asyncio.TimeoutError:
                    continue
                if chunk is None:
                    # Signal end of stream
                    try:
                        await ws.send(json.dumps({"type": "CloseStream"}))
                    except Exception:
                        pass
                    break
                try:
                    await ws.send(chunk)
                except Exception as e:
                    logger.warning("Deepgram send error: %s", e)
                    break

        async def _recv():
            """Receive transcript events from Deepgram."""
            async for message in ws:
                try:
                    data = json.loads(message)
                except Exception:
                    continue

                msg_type = data.get("type", "")

                if msg_type == "Results":
                    channel = data.get("channel", {})
                    alts = channel.get("alternatives", [{}])
                    transcript = alts[0].get("transcript", "").strip()
                    is_final = data.get("is_final", False)

                    if not transcript:
                        continue

                    # Extract speaker from first word if diarized
                    words = alts[0].get("words", [])
                    speaker = words[0].get("speaker") if words else None

                    await on_transcript(transcript, is_final, speaker)

                elif msg_type == "UtteranceEnd":
                    # Final silence — signal end of utterance
                    pass

                elif msg_type in ("Metadata", "SpeechStarted"):
                    pass  # Ignore metadata

                elif msg_type == "Close":
                    break

        await asyncio.gather(_send(), _recv())

    try:
        try:
            # websockets >= 14.0
            async with websockets.connect(url, additional_headers=headers) as ws:
                await _run(ws)
        except TypeError as te:
            if "additional_headers" in str(te) or "unexpected keyword" in str(te):
                # websockets < 14.0
                async with websockets.connect(url, extra_headers=headers) as ws:
                    await _run(ws)
            else:
                raise te
    except Exception as e:
        logger.error("Deepgram streaming error: %s", e)
        await on_transcript(f"[STT error: {e}]", True, None)
