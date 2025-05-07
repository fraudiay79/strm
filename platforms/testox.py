import requests
import re
import base64
import json
import os

# Define URL to fetch the webpage
url = "http://oxax.tv/oh-ah.html"
response = requests.get(url)

# Directory to save output files
output_dir = "links/oxax"
os.makedirs(output_dir, exist_ok=True)

if response.status_code == 200:
    site_content = response.text

    # Extract kodk, kos, and playerjs values using regex
    kodk_match = re.search(r'var kodk\s*=\s*"(.*?)"', site_content)
    kos_match = re.search(r'var kos\s*=\s*"(.*?)"', site_content)
    playerjs_match = re.search(r'new Playerjs\("#(.*?)"\)', site_content)

    if not (kodk_match and kos_match and playerjs_match):
        print("Error: Missing required values (kodk, kos, playerjs) in page source.")
    else:
        kodk = kodk_match.group(1)
        kos = kos_match.group(1)
        playerjs_encoded = playerjs_match.group(1)

        # Debugging: Print extracted playerjs value before decoding
        print(f"Extracted playerjs: {playerjs_encoded}")

        # Fix Base64 padding issue
        missing_padding = len(playerjs_encoded) % 4
        if missing_padding:
            playerjs_encoded += "=" * (4 - missing_padding)

        try:
            decoded_playerjs = base64.b64decode(playerjs_encoded).decode("utf-8")
            print(f"Decoded playerjs: {decoded_playerjs}")  # Debugging step
        except Exception as e:
            print("Error decoding playerjs:", e)
            decoded_playerjs = ""

        # Attempt to parse JSON
        try:
            decoded_json = json.loads(decoded_playerjs)
            print(f"Parsed JSON data: {decoded_json}")  # Debugging step
            v1 = decoded_json.get("v1", "")
            v2 = decoded_json.get("v2", "")
        except json.JSONDecodeError:
            print("Error: Unable to parse decoded playerjs data.")
            v1, v2 = "", ""

        if not v1 or not v2:
            print("Error: v1 and v2 not found in decoded data.")
        else:
            m3uLink = f"{kodk}{v1}{kos}{v2}"

            print(f"Extracted M3U8 URL: {m3uLink}")

            # Save M3U8 file
            output_file = os.path.join(output_dir, "stream.m3u8")
            with open(output_file, "w") as file:
                file.write("#EXTM3U\n")
                file.write("#EXT-X-VERSION:3\n")
                file.write('#EXT-X-STREAM-INF:BANDWIDTH=1755600,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"\n')
                file.write(f"{m3uLink}\n")

            print(f"Created M3U8 file: {output_file}")
else:
    print("Failed to fetch the website content.")
