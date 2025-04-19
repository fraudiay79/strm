import requests

# URL to fetch the JSON data
url = "https://api.tv8.md/v1/live"

# Fetch the JSON data from the API with enhanced headers
headers = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "If-None-Match": 'W/"bda8-xJpq+FZ0vm4swDUgQXowiatz6pk"',
    "Sec-CH-UA": '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1"
}

response = requests.get(url, headers=headers)
if response.status_code != 200:
    print("Error: Unable to fetch data from the API.")
    exit()

try:
    data = response.json()  # Parse the JSON response
except ValueError:
    print("Error: Invalid JSON response.")
    exit()

# Extract the live URL from the JSON
live_url = data.get("liveUrl")
if not live_url:
    print("Error: liveUrl key not found in the JSON response.")
    exit()

# Extract the token from the live URL
token = live_url.split("?token=")[-1]

# Print the updated playlist
print("#EXTM3U")
print(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=2790000,BANDWIDTH=3490000,RESOLUTION=1024x576,FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE')
print(f"https://live.cdn.tv8.md/TV7/tracks-v2a1/mono.ts.m3u8?token={token}")
print(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=6440000,BANDWIDTH=8050000,RESOLUTION=1920x1080,FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE')
print(f"https://live.cdn.tv8.md/TV7/tracks-v1a1/mono.ts.m3u8?token={token}")
