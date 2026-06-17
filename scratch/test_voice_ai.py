import asyncio
import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

import websockets
import json
from auth_utils import create_access_token

async def test_local_voice_websocket():
    # 1. Create a valid access token
    token = create_access_token(user_id=1, email="admin@facetscrm.com", role="Admin")
    print(f"Generated access token: {token[:30]}...")

    # 2. Connect to local backend websocket
    url = f"ws://localhost:8001/api/voice-ai/ws/1?token={token}"
    print(f"Connecting to local voice-ai WebSocket: {url}")

    try:
        async with websockets.connect(url, open_timeout=10.0) as ws:
            print("Successfully connected to local WebSocket!")
            
            # Read first message (should be "ready" from server)
            response = await ws.recv()
            data = json.loads(response)
            print("Server Response:", json.dumps(data, indent=2))
            
            if data.get("type") == "ready":
                print("\nSTT System is ready!")
                if data.get("deepgram") is True:
                    print("SUCCESS: Deepgram is successfully connected and listening!")
                else:
                    print("FAILURE: Deepgram is not connected!")
            else:
                print("Unexpected response type:", data.get("type"))
                
    except Exception as e:
        print(f"Connection failed: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(test_local_voice_websocket())
