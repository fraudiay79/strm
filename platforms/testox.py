import requests
import re
import base64
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
    kodk_match = re.search(r'var kodk="(.*?)"', site_content)
    kos_match = re.search(r'var kos="(.*?)"', site_content)
    playerjs_match = re.search(r'new Playerjs\("(.*?)"\)', site_content)

    if not (kodk_match and kos_match and playerjs_match):
        print("Error: Missing required values (kodk, kos, playerjs) in page source.")
    else:
        kodk = kodk_match.group(1)
        kos = kos_match.group(1)
        playerjs_encoded = playerjs_match.group(1)

        # Decode playerjs value from Base64
        try:
            decoded_playerjs = base64.b64decode(playerjs_encoded).decode("utf-8")
        except Exception as e:
            print("Error decoding playerjs:", e)
            decoded_playerjs = ""

        # Extract v1 and v2 from decoded data
        v1_match = re.search(r"\{v1\}(.*?)\{v2\}([a-zA-Z0-9]*)", decoded_playerjs)

        if not v1_match:
            print("Error: v1 and v2 not found in decoded data.")
        else:
            v1, v2 = v1_match.groups()
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
