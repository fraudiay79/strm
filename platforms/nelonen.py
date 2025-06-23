#!/usr/bin/python3

import requests
import json
import os

print('#EXTM3U')
print('#EXT-X-VERSION:3')
print('#EXT-X-INDEPENDENT-SEGMENTS')

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
    try:
        resplink = s.get(url, headers=headers)
        print(f"\nStatus {resplink.status_code} from {url}")
        print(f"Final URL: {resplink.url}")
        print(f"Redirect chain: {[r.status_code for r in resplink.history]}")
        print(f"Content-Type: {resplink.headers.get('Content-Type')}")

        try:
            response_json = resplink.json()
        except json.JSONDecodeError:
            dump_path = os.path.join(output_dir, f"{name}_raw_response.bin")
            with open(dump_path, "wb") as f:
                f.write(resplink.content)
            print(f"Non-JSON or binary response saved to {dump_path}")
            continue

        # Print full JSON structure
        print(f"\nJSON from {url}:\n")
        print(json.dumps(response_json, indent=2))

        try:
            mastlnk = response_json["clip"]["playback"]["streamUrls"]["android"]["url"]
        except (KeyError, TypeError):
            print(f"HLS URL not found in JSON from {url}")
            continue

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

            for variant, (avg_bandwidth, resolution, bandwidth) in variations.items():
                modified_link = mastlnk.replace("hls-index", variant)
                file.write(
                    f'#EXT-X-STREAM-INF:CODECS="avc1.4D401F,mp4a.40.2",AVERAGE-BANDWIDTH={avg_bandwidth},'
                    f'RESOLUTION={resolution},VIDEO-RANGE=SDR,FRAME-RATE=25.0,BANDWIDTH={bandwidth}\n'
                )
                file.write(f"{modified_link}\n")

    except requests.exceptions.RequestException as e:
        print(f"Network error from {url}: {e}")
