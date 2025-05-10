import requests
import re
import os
import json

# Define the API URL
api_url = "https://api.tv8.md/v1/live"

# Define request headers
headers = {
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://tv8.md/live",
    "Origin": "https://tv8.md",
    "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 8.0.1;)",
}

# Start a session for maintaining consistency
session = requests.Session()
response = session.get(api_url, headers=headers)

# Fetch live URL from API response
if response.status_code == 200:
    json_data = response.json()
    live_url = json_data.get("liveUrl")

    if not live_url:
        print("Error: Live URL not found in API response.")
        exit()
else:
    print("Failed to fetch API content. Status code:", response.status_code)
    exit()

# Base URL for media streams
base_url = "https://live.cdn.tv8.md/TV7/"

# Step 2: Fetch M3U8 content using session
content_response = session.get(live_url, headers=headers)

if content_response.status_code == 200:
    content = content_response.text
    lines = content.split("\n")
    modified_content = ""

    for line in lines:
        if ".ts" in line or ".m3u8" in line:
            full_url = base_url + line
        else:
            full_url = line
        
        modified_content += full_url + "\n"

    print(f"\n--- Modified M3U8 Content ---\n")
    print(modified_content)
else:
    print("Failed to fetch M3U8 content. Status code:", content_response.status_code)
