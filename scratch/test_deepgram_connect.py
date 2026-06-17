import asyncio
import os
import websockets
from dotenv import load_dotenv

load_dotenv("/Users/gaura1/Projects/carbon-ai-main/backend/.env")

async def test_url(params):
    key = os.environ.get("DEEPGRAM_API_KEY")
    url = f"wss://api.deepgram.com/v1/listen?{params}"
    headers = {"Authorization": f"Token {key}"}
    try:
        async with websockets.connect(url, additional_headers=headers) as ws:
            return True, "Success"
    except Exception as e:
        return False, str(e)

async def main():
    test_cases = [
        ("model=nova-2&language=en", "Model + language=en"),
        ("model=nova-2&language=hi", "Model + language=hi"),
        ("model=nova-2&language=multi", "Model + language=multi"),
        ("model=nova-2&language=hi&punctuate=true&diarize=true&smart_format=true&interim_results=true", "All params with language=hi"),
        ("model=nova-2&language=multi&punctuate=true&diarize=true&smart_format=true&interim_results=true", "All params with language=multi"),
    ]

    for params, desc in test_cases:
        ok, msg = await test_url(params)
        status = "✅ OK" if ok else f"❌ FAILED ({msg})"
        print(f"{desc:<60} : {status}")

asyncio.run(main())
