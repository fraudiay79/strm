import requests

# URL to fetch the JSON data
url = "https://vod.tvp.pl/api/products/399702/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER"

# Fetch the JSON data from the API with enhanced headers
headers = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "If-None-Match": 'W/"bda8-xJpq+FZ0vm4swDUgQXowiatz6pk"',
    "Sec-CH-UA": '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"'
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
try:
    live_url = data["sources"]["HLS"][0]["src"]
except (KeyError, IndexError):
    print("Error: Unable to retrieve 'live_url' from the JSON response.")
    exit()

# Validate and extract the token
try:
    token = live_url.split("/2686611734/")[1].split("/156/")[0]
except IndexError:
    print("Error: Unable to extract the token from the live URL.")
    exit()

# Print the updated playlist
print("#EXTM3U")
print("#EXT-X-VERSION:4")
print("#EXT-X-INDEPENDENT-SEGMENTS")
print(f'#EXT-X-STREAM-INF:BANDWIDTH=10243200,AVERAGE-BANDWIDTH=6811200,CODECS="avc1.64002a,mp4a.40.2",RESOLUTION=1920x1080,FRAME-RATE=50.000,AUDIO="program_audio_0"')
print(f"https://rsdt-krk201-5.tvp.pl/token/video/live/51696827/20250422/2686611734/{token}/156/master_v1.m3u8")
print(f'#EXT-X-STREAM-INF:BANDWIDTH=10243200,AVERAGE-BANDWIDTH=6811200,CODECS="avc1.64002a,mp4a.40.2",RESOLUTION=1920x1080,FRAME-RATE=50.000,AUDIO="program_audio_1"')
print(f"https://rsdt-krk201-5.tvp.pl/token/video/live/51696827/20250422/2686611734/{token}/156/master_v1.m3u8")
print("#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=5016000,AVERAGE-BANDWIDTH=3300000,CODECS="avc1.64002a",RESOLUTION=1920x1080,FRAME-RATE=50.000,URI="master_v1_I-Frame.m3u8"")
print(f'#EXT-X-STREAM-INF:BANDWIDTH=4056800,AVERAGE-BANDWIDTH=2741200,CODECS="avc1.640020,mp4a.40.2",RESOLUTION=1024x576,FRAME-RATE=50.000,AUDIO="program_audio_0"')
print(f"https://rsdt-krk201-5.tvp.pl/token/video/live/51696827/20250422/2686611734/{token}/156/master_v2.m3u8")
print(f'#EXT-X-STREAM-INF:BANDWIDTH=4056800,AVERAGE-BANDWIDTH=2741200,CODECS="avc1.640020,mp4a.40.2",RESOLUTION=1024x576,FRAME-RATE=50.000,AUDIO="program_audio_1"')
print(f"https://rsdt-krk201-5.tvp.pl/token/video/live/51696827/20250422/2686611734/{token}/156/master_v2.m3u8")
print("#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=1922800,AVERAGE-BANDWIDTH=1265000,CODECS="avc1.640020",RESOLUTION=1024x576,FRAME-RATE=50.000,URI="master_v2_I-Frame.m3u8"")
print(f'#EXT-X-STREAM-INF:BANDWIDTH=1047200,AVERAGE-BANDWIDTH=761200,CODECS="avc1.64001e,mp4a.40.2",RESOLUTION=512x288,FRAME-RATE=50.000,AUDIO="program_audio_0"')
print(f"https://rsdt-krk201-5.tvp.pl/token/video/live/51696827/20250422/2686611734/{token}/156/master_v3.m3u8")
print(f'#EXT-X-STREAM-INF:BANDWIDTH=1047200,AVERAGE-BANDWIDTH=761200,CODECS="avc1.64001e,mp4a.40.2",RESOLUTION=512x288,FRAME-RATE=50.000,AUDIO="program_audio_1"')
print(f"https://rsdt-krk201-5.tvp.pl/token/video/live/51696827/20250422/2686611734/{token}/156/master_v3.m3u8")
print("#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=418000,AVERAGE-BANDWIDTH=275000,CODECS="avc1.64001e",RESOLUTION=512x288,FRAME-RATE=50.000,URI="master_v3_I-Frame.m3u8"")
print("#EXT-X-MEDIA:TYPE=AUDIO,LANGUAGE="pol",NAME="Polski",AUTOSELECT=YES,DEFAULT=YES,CHANNELS="2",GROUP-ID="program_audio_0",URI="master_a1.m3u8"")
print("#EXT-X-MEDIA:TYPE=AUDIO,LANGUAGE="pl-x-aux",NAME="Audiodeskrypcja",AUTOSELECT=NO,DEFAULT=NO,CHANNELS="2",GROUP-ID="program_audio_1",URI="master_a2.m3u8"")
