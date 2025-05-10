import os
import requests
import json

# Define the API URL
api_url = "https://api.tv8.md/v1/live"

# Define request headers
headers = {
    "Referer": "https://tv8.md/live",
    "Origin": "https://tv8.md",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36"
}

# Initialize session for better request handling
session = requests.Session()

# Directory to save output files
output_dir = "links/md"
os.makedirs(output_dir, exist_ok=True)

try:
    response = session.get(api_url, headers=headers)
    response.raise_for_status()

    # Parse JSON response
    response_json = response.json()
    mastlnk = response_json.get("liveUrl")

    if not mastlnk:
        raise KeyError("Missing 'liveUrl' in response JSON.")

    # Extract the token from the original URL
    token = mastlnk.split("?token=")[-1]

    # Define resolution variations
    variations = {
        "tracks-v2a1/mono.ts": (2750000, 3440000, "1024x576"),
        "tracks-v1a1/mono.ts": (6370000, 7960000, "1920x1080")
    }

    output_file = os.path.join(output_dir, "tv8md.m3u8")

    with open(output_file, "w") as file:
        file.write("#EXTM3U\n")

        for variant, (bandwidth, avg_bandwidth, resolution) in variations.items():
            modified_link = mastlnk.replace("index.m3u8", f"{variant}.m3u8?token={token}")

            file.write(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH={avg_bandwidth},BANDWIDTH={bandwidth},RESOLUTION={resolution},FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE\n')
            file.write(f"{modified_link}\n")

    print(f"Created file: {output_file}")

except requests.exceptions.HTTPError as e:
    print(f"HTTP Error: {e}")
except requests.exceptions.Timeout:
    print("Request Timeout: The request took too long to complete.")
except requests.exceptions.RequestException as e:
    print(f"General Request Error: {e}")
except (KeyError, json.JSONDecodeError) as e:
    print(f"Error parsing JSON from {api_url}: {e}")
