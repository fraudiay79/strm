import requests
import json
import time

# Proxy setup (optional)
proxy = ''
proxies = {"http": proxy, "https": proxy} if proxy else None

# Channel name filter
filter_map = {
    "Auto Plus": "Авто Плюс"
}

def process_filter_table_local(channels):
    """Apply name filters to the channels list."""
    for channel in channels:
        if channel["name"] in filter_map:
            channel["name"] = filter_map[channel["name"]]
    return channels

def get_token():
    """Retrieve access token from the API."""
    url = "http://api.myvideo.ge/api/v1/auth/token"
    body = {"client_id": 7, "grant_type": "client_implicit"}
    headers = {"Origin": "http://tv.myvideo.ge", "Referer": "http://tv.myvideo.ge/"}

    response = requests.post(url, data=body, headers=headers, proxies=proxies)
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

def load_from_site():
    """Fetch TV channel list from the API."""
    token = get_token()
    if not token:
        print("Failed to retrieve token.")
        return []

    headers = {
        "Referer": f"http://tv.myvideo.ge/index.html?cache={int(time.time())}&act=dvr&newApi=true",
        "Authorization": f"Bearer {token}"
    }
    url = "http://api.myvideo.ge/api/v1/channel?type=tv"

    response = requests.get(url, headers=headers, proxies=proxies)
    if response.status_code != 200:
        print("Failed to retrieve channels.")
        return []

    data = response.json().get("data", [])
    channels = []
    for item in data:
        channel = {
            "name": item["attributes"]["name"],
            "address": f"http://tv.myvideo.ge/tv/{item['attributes']['slug']}",
            "logo": item["relationships"]["logo"]["data"]["relationships"]["sizes"]["data"]["original"]["attributes"]["url"]
        }
        if item["attributes"].get("recordingDuration", 0) > 0:
            channel["RawM3UString"] = f'catchup="flussonic" catchup-minutes="{item["attributes"]["recordingDuration"] // 60}"'
            channel["address"] += "&tshift=true"
        else:
            channel["address"] += "&tshift=false"
        channels.append(channel)

    return process_filter_table_local(channels)

def generate_m3u(channels, output_file="out_myvideoge.m3u"):
    """Generate M3U playlist from the fetched channel list."""
    with open(output_file, "w", encoding="utf-8") as f:
        for channel in channels:
            f.write(f'#EXTINF:-1 tvg-logo="{channel["logo"]}",{channel["name"]}\n{channel["address"]}\n')

    print(f"Playlist saved to {output_file}")

if __name__ == "__main__":
    channels = load_from_site()
    if channels:
        generate_m3u(channels)
