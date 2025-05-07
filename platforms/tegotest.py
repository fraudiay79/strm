import requests
import os
import json

# Define the token URL
TOKEN_URL = "https://api.siberapi.com/sso/get_guest_token.php?app_id=1"

# List of streaming URLs
STREAMING_URLS = [
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/1?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/2?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
]

# Corresponding names for output files
NAMES = ["ttt", "synergy"]

# Directory to save output files
OUTPUT_DIR = "links/test"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Predefined bitrate and resolution variations
VARIATIONS = {
    "tracks-v1a1": (440000, 350000, "256x144"),
    "tracks-v2a1": (780000, 620000, "640x360"),
    "tracks-v3a1": (1300000, 1040000, "1024x576"),
    "tracks-v4a1": (1980000, 1580000, "1280x720"),
}


def fetch_access_token():
    """Fetch the access token from the API."""
    response = requests.get(TOKEN_URL)
    if response.status_code == 200:
        token_data = response.json()
        return token_data.get("access_token")
    print(f"Failed to fetch token. Status code: {response.status_code}")
    return None


def fetch_json_data(url, headers):
    """Fetch JSON data from the given URL."""
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
        print(f"Error fetching/parsing data from {url}: {e}")
        return None


def process_streaming_links():
    """Fetch and process the m3u8 streaming content dynamically."""
    access_token = fetch_access_token()
    if not access_token:
        print("Access Token retrieval failed.")
        return

    headers = {
        "authorization": f"Bearer {access_token}",
        "accept": "*/*",
    }

    for url, name in zip(STREAMING_URLS, NAMES):
        json_data = fetch_json_data(url, headers)
        if not json_data:
            continue

        mastlnk = json_data.get("response", {}).get("tv_channel", [{}])[0].get("streaming_url")
        if not mastlnk:
            print(f"Error: Streaming URL missing for {name}.")
            continue

        base_url, token = mastlnk.split("?token=")
        base_url = base_url.replace("index.m3u8", "")

        output_file = os.path.join(OUTPUT_DIR, f"{name}.m3u8")

        with open(output_file, "w") as file:
            file.write("#EXTM3U\n")

            for variant, (bandwidth, avg_bandwidth, resolution) in VARIATIONS.items():
                modified_link = f"{base_url}{variant}/mono.m3u8?token={token}"
                file.write(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH={avg_bandwidth},BANDWIDTH={bandwidth},RESOLUTION={resolution}\n')
                file.write(f"{modified_link}\n")

        # Print the modified links with metadata
        print(f"--- M3U8 Content for {name} ---")
        print("#EXTM3U")
        for variant, (bandwidth, avg_bandwidth, resolution) in VARIATIONS.items():
            print(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH={avg_bandwidth},BANDWIDTH={bandwidth},RESOLUTION={resolution}')
            print(f"{base_url}{variant}/mono.m3u8?token={token}")

        print(f"Created file: {output_file}")


# Run the processing function
process_streaming_links()
