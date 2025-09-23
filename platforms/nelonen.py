#!/usr/bin/python3

import requests
import json
import os
import base64
import time

VARIATIONS = {
    "hls-index_9": (1209948, "768x432", 1517906),
    "hls-index_10": (2027339, "1024x576", 2571659),
    "hls-index_11": (3764296, "1280x720", 4810886),
    "hls-index_12": (5296904, "1920x1080", 6786673),
}

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

def get_stream_data(session, url, max_retries=2):
    for attempt in range(max_retries):
        try:
            response = session.get(url)
            if response.status_code == 200:
                data = response.json()
                media = data["clip"]["playback"].get("media", {})
                android = media.get("streamUrls", {}).get("android")
                
                if android and "url" in android:
                    token = android.get("token")
                    if token and is_token_expired(token) and attempt == 0:
                        print("🔁 Token expired, retrying...")
                        continue
                    return android
            else:
                print(f"HTTP {response.status_code}")
                return None
        except Exception as e:
            print(f"Request error: {e}")
            if attempt < max_retries - 1:
                time.sleep(1)
    return None

def main():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.nelonen.fi/',
        'X-Requested-With': 'XMLHttpRequest'
    }

    urls = [
        "https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584964",
        "https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2582939",
        "https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584968",
        "https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584966"
    ]

    names = ["jim", "nelonen", "liv", "hero"]
    output_dir = "links/fi"
    os.makedirs(output_dir, exist_ok=True)

    with requests.Session() as s:
        s.headers.update(headers)
        
        for url, name in zip(urls, names):
            print(f"\nProcessing {name} from {url}")
            
            android_block = get_stream_data(s, url)
            if not android_block or "url" not in android_block:
                print(f"❌ Failed to get stream URL for {name}")
                continue

            mastlnk = android_block["url"]
            if not mastlnk.startswith(('http://', 'https://')):
                print(f"❌ Invalid URL format for {name}")
                continue

            output_file = os.path.join(output_dir, f"{name}.m3u8")
            try:
                with open(output_file, "w") as file:
                    file.write("#EXTM3U\n")
                    file.write("#EXT-X-VERSION:3\n")
                    file.write("#EXT-X-INDEPENDENT-SEGMENTS\n")
                    for variant, (avg_bw, res, bw) in VARIATIONS.items():
                        mod_url = mastlnk.replace("hls-index", variant)
                        file.write(
                            f'#EXT-X-STREAM-INF:CODECS="avc1.4D401F,mp4a.40.2",AVERAGE-BANDWIDTH={avg_bw},'
                            f'RESOLUTION={res},VIDEO-RANGE=SDR,FRAME-RATE=25.0,BANDWIDTH={bw}\n'
                        )
                        file.write(f"{mod_url}\n")
                print(f"✅ Saved: {output_file}")
            except IOError as e:
                print(f"❌ File write error for {name}: {e}")

if __name__ == "__main__":
    main()
