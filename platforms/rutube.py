import requests
import json
import re
import os

# Directory to save output files
output_dir = "links/rutube_tv"
os.makedirs(output_dir, exist_ok=True)

# Define filters for renaming channels
FILTERS = {
    "Setanta Sports Plus": "Setanta Sports+",
    "Евроспорт 2": "Eurosport 2"
}

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0"
BASE_URL = "https://rutube.ru/api/video/topic/1/"

def fetch_channel_list(url=None):
    """Fetch list of channels from Rutube API"""
    if url is None:
        url = BASE_URL

    headers = {"User-Agent": USER_AGENT}
    response = requests.get(url, headers=headers, timeout=8)

    if response.status_code != 200:
        print("Error fetching channel list.")
        return []

    data = response.json()
    if "results" not in data:
        return []

    channels = []
    for item in data["results"]:
        if item.get("is_paid"):
            continue

        title = item["title"]
        stream_url = item.get("video_url", "")
        logo = item.get("author", {}).get("avatar_url", "")

        if not stream_url:
            continue

        title = clean_title(title)
        channels.append({"name": FILTERS.get(title, title), "address": stream_url, "logo": logo})

    # If there's a next page, fetch more channels
    next_url = data.get("next")
    if next_url:
        channels.extend(fetch_channel_list(next_url))

    return channels

def clean_title(title):
    """Remove unnecessary characters from title"""
    return re.sub(r'[«»",:!]', '', title).replace('-', ' ').replace('.', ' ')

def save_m3u8(filename, channels):
    """Save fetched channel list in M3U8 format"""
    filepath = os.path.join(output_dir, filename)
    with open(filepath, "w", encoding="utf-8") as file:
        file.write("#EXTM3U\n")
        for channel in channels:
            file.write(f'#EXTINF:-1 tvg-logo="{channel["logo"]}",{channel["name"]}\n{channel["address"]}\n')
    
    print(f"Saved M3U8 file: {filepath}")

if __name__ == "__main__":
    channels = fetch_channel_list()
    
    if channels:
        save_m3u8("RutubeTV.m3u8", channels)
    else:
        print("No channels found.")
