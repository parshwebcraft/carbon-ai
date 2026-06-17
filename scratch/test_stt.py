import asyncio
import sys
import os
from pathlib import Path
import logging

# Setup debug logging for websockets
logging.basicConfig(level=logging.DEBUG)

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

import websockets

async def test_deepgram():
    key = os.environ.get("DEEPGRAM_API_KEY", "").strip()
    if not key:
        print("Error: DEEPGRAM_API_KEY is not set in backend/.env")
        return

    # Using multi-language model Nova-2 as defined in deepgram_stt.py
    url = "wss://api.deepgram.com/v1/listen?model=nova-2&language=multi&punctuate=true"
    headers = {"Authorization": f"Token {key}"}

    print(f"Connecting to: {url}")
    print(f"Headers: {headers}")

    try:
        # Try with a larger open_timeout
        async with websockets.connect(url, additional_headers=headers, open_timeout=20.0) as ws:
            print("\nSuccessfully connected to Deepgram!")
            # Send a dummy close message
            await ws.send('{"type": "CloseStream"}')
            print("Successfully sent message to Deepgram!")
    except Exception as e:
        print(f"\nConnection failed: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(test_deepgram())
