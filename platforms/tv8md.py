import requests
import json

# Base URL for constructing full URLs
base_url = "https://live.cdn.tv8.md/TV7/"
url = "https://api.tv8.md/v1/live"

# Create a session and fetch the live URL from the API
s = requests.Session()
resplink = s.get(url)
response_json = json.loads(resplink.text)

# Extract the live URL from the response JSON
mastlnk = response_json["liveUrl"]

# Extract the token value from the "liveUrl"
token = mastlnk.split("?token=")

# Print the updated playlist
print("#EXTM3U")
print(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=2790000,BANDWIDTH=3490000,RESOLUTION=1024x576,FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE')
print(f"https://live.cdn.tv8.md/TV7/tracks-v2a1/mono.ts.m3u8?token={token}")
print(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=6440000,BANDWIDTH=8050000,RESOLUTION=1920x1080,FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE')
print(f"https://live.cdn.tv8.md/TV7/tracks-v1a1/mono.ts.m3u8?token={token}")
