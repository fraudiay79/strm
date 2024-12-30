import urllib.request
import json
import os

# Create the 'mediabay' directory if it doesn't exist
output_dir = 'mediabay'
os.makedirs(output_dir, exist_ok=True)

import urllib.request
import json

def fetch_m3u8_url():
    api_url = "https://api.mediabay.tv/v2/channels/thread/90"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
    }

    try:
        # Create a request with headers
        req = urllib.request.Request(api_url, headers=headers)

        # Fetch data from the API
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())

        # Extract the m3u8 URL from the JSON response
        m3u8_url = data.get('data', [])[0].get('threadAddress', '')
        print(f"m3u8 URL: {m3u8_url}")

    except Exception as e:
        print(f"An error occurred: {e}")

# Call the function
fetch_m3u8_url()
