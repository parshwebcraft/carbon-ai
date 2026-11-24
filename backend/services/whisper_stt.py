"""Whisper Speech-to-Text service for WhatsApp Voice Notes.

Transcribes audio/voice notes in Hindi, Hinglish, and English using Groq's
ultra-low-latency Whisper Large v3 (with OpenAI and Deepgram fallbacks).
"""
import io
import logging
import os
from typing import Optional
from dotenv import load_dotenv
import httpx

load_dotenv()

logger = logging.getLogger("facets.whisper_stt")


# Context prompt helps Whisper accurately transcribe domain terms and Hinglish slang
DEFAULT_WHISPER_PROMPT = (
    "Hindi, Hinglish, English, WhatsApp voice note, ParshWebCraft, fees, class, gym, "
    "batch, admission, booking, timing, subah, shaam, online payment, link, website, demo."
)


def transcribe_audio_bytes(
    audio_bytes: bytes,
    filename: str = "voice.ogg",
    mimetype: str = "audio/ogg",
    prompt: Optional[str] = None,
) -> str:
    """Transcribe raw audio bytes into text using Whisper Large v3."""
    if not audio_bytes or len(audio_bytes) < 100:
        return ""

    context_prompt = prompt or DEFAULT_WHISPER_PROMPT

    # 1. Primary Engine: Groq Whisper Large v3 (sub-second latency & superior Hindi/Hinglish)
    groq_key = os.environ.get("GROQ_API_KEY", "").strip()
    if groq_key:
        try:
            files = {"file": (filename, io.BytesIO(audio_bytes), mimetype)}
            data = {
                "model": "whisper-large-v3",
                "temperature": "0.0",
                "prompt": context_prompt,
            }
            with httpx.Client(timeout=35.0) as client:
                r = client.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {groq_key}"},
                    files=files,
                    data=data,
                )
                if r.status_code == 200:
                    text = r.json().get("text", "").strip()
                    if text:
                        logger.info("Groq Whisper transcribed %d bytes -> '%s'", len(audio_bytes), text[:80])
                        return text
                else:
                    logger.warning("Groq Whisper returned status %d: %s", r.status_code, r.text[:200])
        except Exception as e:
            logger.warning("Groq Whisper transcription failed: %s", e)

    # 2. Secondary Engine: OpenAI Whisper-1
    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if openai_key and not openai_key.startswith("your-"):
        try:
            files = {"file": (filename, io.BytesIO(audio_bytes), mimetype)}
            data = {
                "model": "whisper-1",
                "temperature": "0.0",
                "prompt": context_prompt,
            }
            with httpx.Client(timeout=35.0) as client:
                r = client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {openai_key}"},
                    files=files,
                    data=data,
                )
                if r.status_code == 200:
                    text = r.json().get("text", "").strip()
                    if text:
                        logger.info("OpenAI Whisper transcribed %d bytes -> '%s'", len(audio_bytes), text[:80])
                        return text
                else:
                    logger.warning("OpenAI Whisper returned status %d: %s", r.status_code, r.text[:200])
        except Exception as e:
            logger.warning("OpenAI Whisper transcription failed: %s", e)

    # 3. Tertiary Engine: Deepgram Nova-2
    try:
        from services import deepgram_stt
        if deepgram_stt.is_configured():
            dg_text = deepgram_stt.transcribe_bytes(audio_bytes, mimetype=mimetype)
            if dg_text and dg_text.strip():
                logger.info("Deepgram transcribed %d bytes -> '%s'", len(audio_bytes), dg_text[:80])
                return dg_text.strip()
    except Exception as e:
        logger.warning("Deepgram STT fallback failed: %s", e)

    logger.error("All STT transcription engines failed for audio file %s", filename)
    return ""


def transcribe_file(file_path: str, prompt: Optional[str] = None) -> str:
    """Transcribe an audio file saved on disk."""
    if not os.path.exists(file_path):
        return ""
    with open(file_path, "rb") as f:
        content = f.read()
    filename = os.path.basename(file_path)
    ext = filename.split(".")[-1].lower() if "." in filename else "ogg"
    mimetype = "audio/mpeg" if ext == "mp3" else f"audio/{ext}"
    return transcribe_audio_bytes(content, filename=filename, mimetype=mimetype, prompt=prompt)
