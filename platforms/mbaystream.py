import requests
import json
import base64
import re

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; rv:86.0) Gecko/20100101 Firefox/86.0"

def decode_url(encoded_url):
    """Decode a Base64-encoded URL"""
    return base64.b64decode(encoded_url).decode()

def fetch_json(url):
    """Fetch and decode JSON from a given URL"""
    headers = {"User-Agent": USER_AGENT}
    response = requests.get(url, headers=headers, timeout=12)
    
    if response.status_code != 200:
        return None
    
    return response.json()

def extract_streams(playlist_url):
    """Extract different stream quality links from a given playlist URL"""
    headers = {"User-Agent": USER_AGENT, "Referer": playlist_url}
    response = requests.get(playlist_url, headers=headers, timeout=12)

    if response.status_code != 200:
        return []

    base_url = re.match(r"(.+/)", playlist_url).group(1)
    streams = []
    
    for match in re.findall(r"EXT-X-STREAM-INF.*?RESOLUTION=\d+x(\d+).*?\n(.+)", response.text):
        quality, link = match
        if not link.startswith("http"):
            link = base_url + link.lstrip("/")
        streams.append((int(quality), f"{link}$OPT:http-referrer={playlist_url}$OPT:http-user-agent={USER_AGENT}"))

    return sorted(streams, key=lambda x: x[0])

def get_mediabay_stream(tv_id):
    """Fetch stream URLs for a given TV channel ID"""
    api_url = "http://api.mediabay.tv/v2/channels/thread/" + tv_id
    data = fetch_json(api_url)

    if not data or "data" not in data or not data["data"]:
        return None

    stream_url = data["data"][0].get("threadAddress")
    if not stream_url:
        return None

    return extract_streams(stream_url)

if __name__ == "__main__":
    tv_id = input("Enter Mediabay TV ID: ")
    streams = get_mediabay_stream(tv_id)

    if streams:
        print("Available streams:")
        for quality, url in streams:
            print(f"{quality}p - {url}")
    else:
        print("Error fetching stream data.")
