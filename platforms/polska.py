#! /usr/bin/python3

import requests
import json
import os

print('#EXTM3U')
print('#EXT-X-VERSION:4')
print('#EXT-X-INDEPENDENT-SEGMENTS')

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'
}
s = requests.Session()

# List of URLs to fetch JSON data
urls = [
    "https://vod.tvp.pl/api/products/399697/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399698/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399702/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399703/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399701/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399700/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399729/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399721/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399728/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/1998766/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399704/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399727/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399726/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399725/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399724/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399723/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399722/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399731/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399699/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER"
]

# Corresponding names for the output files
names = [
    "tvp1",
    "tvp2",
    "tvpsport",
    "tvphistoria",
    "tvpkobieta",
    "tvpkultura",
    "belsat",
    "tvpdokument",
    "tvpkultura2",
    "tvpnadobre",
    "tvpabc",
    "tvpabc2",
    "alfatvp",
    "tvphistoria2",
    "tvprozrywka",
    "tvppolonia",
    "tvpnauka",
    "tvpworld",
    "tvpinfo"
]

# Directory to save output files
output_dir = "links"
os.makedirs(output_dir, exist_ok=True)

# Process each URL and save to corresponding file
for url, name in zip(urls, names):
    try:
        resplink = s.get(url, headers=headers)
        resplink.raise_for_status()
        response_json = resplink.json()
        mastlnk = response_json["sources"]["HLS"][0]["src"]

        # Generate multiple resolution variations
        variations = {
            "master_v1": (10243200, 6811200, "1920x1080"),
            "master_v2": (4056800, 2741200, "1024x576"),
            "master_v3": (1047200, 761200, "512x288"),
        }

        output_file = os.path.join(output_dir, f"{name}.m3u8")

        with open(output_file, "w") as file:
            file.write("#EXTM3U\n")
            file.write("#EXT-X-VERSION:4\n")
            file.write("#EXT-X-INDEPENDENT-SEGMENTS\n")

            for variant, (bandwidth, avg_bandwidth, resolution) in variations.items():
                modified_link = mastlnk.replace("master", variant)
                file.write(f'#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},AVERAGE-BANDWIDTH={avg_bandwidth},CODECS="avc1.64002a,mp4a.40.2",RESOLUTION={resolution},FRAME-RATE=50.000,AUDIO="program_audio_0"\n')
                file.write(f"{modified_link}\n")

            # Handle audio track separately
            audio_link = mastlnk.replace("master", "master_a1")
            file.write(f'#EXT-X-MEDIA:TYPE=AUDIO,LANGUAGE="pol",NAME="Polski",AUTOSELECT=YES,DEFAULT=YES,CHANNELS="2",GROUP-ID="program_audio_0",URI="{audio_link}"\n')

        #print(f"Created file: {output_file}")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from {url}: {e}")
    except (KeyError, IndexError, json.JSONDecodeError):
        print(f"Error: Unable to retrieve 'HLS' m3u8 link from {url}.")
