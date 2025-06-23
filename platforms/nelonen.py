#! /usr/bin/python3

import requests
import json
import os

print('#EXTM3U')
print('#EXT-X-VERSION:3')
print('#EXT-X-INDEPENDENT-SEGMENTS')

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'
}
s = requests.Session()

# List of URLs to fetch JSON data
urls = [
    "https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584964",
    "https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2582939",
    "https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584968",
    "https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584966"
]

# Corresponding names for the output files
names = [
    "jim",
    "nelonen",
    "liv",
    "hero"
]

# Directory to save output files
output_dir = "links/fi"
os.makedirs(output_dir, exist_ok=True)

# Process each URL and save to corresponding file
for url, name in zip(urls, names):
    try:
        resplink = s.get(url, headers=headers)
        resplink.raise_for_status()
        response_json = resplink.json()
        mastlnk = response_json["clip"]["playback"]["streamUrls"]["android"]["url"]

        # Generate multiple resolution variations
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
                modified_link = mastlnk.replace("hls_index", variant)
                file.write(f'#EXT-X-STREAM-INF:CODECS="avc1.4D401F,mp4a.40.2",AVERAGE-BANDWIDTH={avg_bandwidth},RESOLUTION={resolution},VIDEO-RANGE=SDR,FRAME-RATE=25.0,BANDWIDTH={bandwidth}\n')
                file.write(f"{modified_link}\n")


        #print(f"Created file: {output_file}")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from {url}: {e}")
    except (KeyError, IndexError, json.JSONDecodeError):
        print(f"Error: Unable to retrieve 'HLS' m3u8 link from {url}.")
