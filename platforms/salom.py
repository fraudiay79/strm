import os
import requests
import json
import urllib.parse

# Define the API URL
api_url = "https://spectator-api.salomtv.uz/v1/tv/channel"

# Define request headers
headers = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    "Host": "spectator-api.salomtv.uz",
    "Origin": "https://salomtv.uz",
    "Referer": "https://salomtv.uz/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    "sec-ch-ua": "\"Chromium\";v=\"136\", \"Google Chrome\";v=\"136\", \"Not.A/Brand\";v=\"99\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\""
}

# Directory to save output files
output_dir = "links/salom"
os.makedirs(output_dir, exist_ok=True)

# Fetch the JSON data
session = requests.Session()
session.headers.update(headers)

response = session.get(api_url)
if response.status_code == 200:
    data = response.json()

    # Process M3U8 files
    for channel in data.get("tv_channels", []):
        flusonic_id = channel.get("flusonic_id")
        m3u8_url = channel.get("url")

        if flusonic_id and m3u8_url:
            content_response = session.get(m3u8_url)

            if content_response.status_code == 200:
                content = content_response.text
                lines = content.split("\n")
                modified_content = ""

                base_url = urllib.parse.urljoin(m3u8_url, "/")  # More robust URL handling

                for line in lines:
                    line = line.strip()
                    if line.startswith("tracks"):
                        full_url = base_url + line
                        modified_content += full_url + "\n"
                    else:
                        modified_content += line + "\n"

                # Save modified M3U8 content
                filename = os.path.join(output_dir, f"{flusonic_id}.m3u8")
                with open(filename, "w") as file:
                    file.write(modified_content)
                
                print(f"Saved {filename}")
            else:
                print(f"Failed to fetch M3U8 content for {flusonic_id}")
else:
    print(f"Failed to fetch data from API. Status code: {response.status_code}")
