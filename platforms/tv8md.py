import requests

# URL to fetch the JSON data
url = "https://api.tv8.md/v1/live"

# Fetch the JSON data from the API
response = requests.get(url)
data = response.json()  # Parse the JSON response

# Extract the live URL from the JSON
live_url = data["liveUrl"]

# Extract the token from the live URL
token = live_url.split("?token=")[-1]

# Print the updated playlist
print("#EXTM3U")
print(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=2790000,BANDWIDTH=3490000,RESOLUTION=1024x576,FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE')
print(f"https://live.cdn.tv8.md/TV7/tracks-v2a1/mono.ts.m3u8?token={token}")
print(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=6440000,BANDWIDTH=8050000,RESOLUTION=1920x1080,FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE')
print(f"https://live.cdn.tv8.md/TV7/tracks-v1a1/mono.ts.m3u8?token={token}")
