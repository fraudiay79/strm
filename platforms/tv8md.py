#! /usr/bin/python3

import requests
import json
import os

print('#EXTM3U')

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'
}
s = requests.Session()

# URL to fetch the JSON data
url = "https://api.tv8.md/v1/live"

name = ["tv8md"]

# Directory to save output files
output_dir = "links"
os.makedirs(output_dir, exist_ok=True)

# Process each URL and save to corresponding file
for url, name in zip(url, name):
    try:
        resplink = s.get(url, headers=headers)
        resplink.raise_for_status()
        response_json = resplink.json()
        mastlnk = response_json["liveUrl"]

        # Generate multiple resolution variations
        variations = {
            "tracks-v2a1/mono.ts.m3u8": (2960000, 3700000, "1024x576"),
            "tracks-v1a1/mono.ts.m3u8": (6600000, 8250000, "1920x1080")
        }

        output_file = os.path.join(output_dir, f"{name}.m3u8")

        with open(output_file, "w") as file:
            file.write("#EXTM3U\n")

            for variant, (bandwidth, avg_bandwidth, resolution) in variations.items():
                modified_link = mastlnk.replace("index.m3u8", variant)
				file.write(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH={avg_bandwidth},BANDWIDTH={bandwidth},RESOLUTION={resolution},FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE\n')
                file.write(f"{modified_link}\n")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from {url}: {e}")
    except (KeyError, IndexError, json.JSONDecodeError):
        print(f"Error: Unable to retrieve 'liveUrl' m3u8 link from {url}.")
