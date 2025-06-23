#!/usr/bin/python3

import requests
import json
import os
import base64
import time

def is_token_expired(jwt_token):
    try:
        payload_encoded = jwt_token.split('.')[1]
        padding = '=' * (-len(payload_encoded) % 4)
        payload_bytes = base64.urlsafe_b64decode(payload_encoded + padding)
        payload = json.loads(payload_bytes)
        exp = payload.get("exp")
        if exp:
            return int(time.time()) > exp
        return False
    except Exception as e:
        print(f"Token decode error: {e}")
        return False

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.nelonen.fi/',
    'X-Requested-With': 'XMLHttpRequest'
}

s = requests.Session()

urls = [
    "https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584964",
    "https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2582939",
    "https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584968",
    "https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584966"
]

names = ["jim", "nelonen", "liv", "hero"]
output_dir = "links/fi"
os.makedirs(output_dir, exist_ok=True)

for url, name in zip(urls, names):
    def fetch_fresh_token():
        try:
            response = s.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                media = data["clip"]["playback"].get("media", {})
                android = media.get("streamUrls", {}).get("android")
                return android if isinstance(android, dict) else None
        except Exception as e:
            print(f"Token fetch error for {name}: {e}")
        return None

    print(f"\nProcessing {name} from {url}")
    android_block = fetch_fresh_token()
    if not android_block or "url" not in android_block:
        print(f"❌ Failed to get stream URL for {name}")
        continue

    token = android_block.get("token")
    if token and is_token_expired(token):
        print(f"🔁 Token expired for {name}, fetching fresh data...")
        android_block = fetch_fresh_token()
        if not android_block or "url" not in android_block:
            print(f"❌ Failed to refresh token for {name}")
            continue

    mastlnk = android_block["url"]

    variations = {
        "hls-index_9": (1209948, "768x432", 1517906),
        "hls-index_10": (2027339, "1024x576", 2571659),
        "hls-index_11": (3764296, "1280x720", 4810886),
        "hls-index_12": (5296904, "1920x1080", 6786673),
    }

    output_file = os.path.join(output_dir, f"{name}.m3u8")
    with open(output_file, "w") as file:
        file.write("#EXTM3U\n")
        file.write("#EXT-X-VERSION:3\n")
        file.write("#EXT-X-INDEPENDENT-SEGMENTS\n")
        for variant, (avg_bw, res, bw) in variations.items():
            mod_url = mastlnk.replace("hls-index", variant)
            file.write(
                f'#EXT-X-STREAM-INF:CODECS="avc1.4D401F,mp4a.40.2",AVERAGE-BANDWIDTH={avg_bw},'
                f'RESOLUTION={res},VIDEO-RANGE=SDR,FRAME-RATE=25.0,BANDWIDTH={bw}\n'
            )
            file.write(f"{mod_url}\n")

    print(f"✅ Saved: {output_file}")
