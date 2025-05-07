import requests
import os
import json

# Define the token URL
TOKEN_URL = "https://api.siberapi.com/sso/get_guest_token.php?app_id=1"

# List of streaming URLs
STREAMING_URLS = [
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/1?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/2?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
    # Add more URLs if needed...
]

# Corresponding names for output files
NAMES = ["ttt", "synergy"]

# Directory to save output files
OUTPUT_DIR = "links/test"
os.makedirs(OUTPUT_DIR, exist_ok=True)


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

        # Fetch the m3u8 file content dynamically
        try:
            m3u8_response = requests.get(mastlnk, headers=headers)
            m3u8_response.raise_for_status()
            m3u8_content = m3u8_response.text
        except requests.exceptions.RequestException as e:
            print(f"Error fetching m3u8 content for {name}: {e}")
            continue

        # Print out the lines from the m3u8 content
        print(f"--- M3U8 Content for {name} ---")
        print(m3u8_content)

        # Save the content to a file
        output_file = os.path.join(OUTPUT_DIR, f"{name}.m3u8")
        with open(output_file, "w") as file:
            file.write(m3u8_content)

        print(f"Created file: {output_file}")


# Run the processing function
process_streaming_links()
