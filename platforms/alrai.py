import requests
import re

url = 'https://www.alraimedia.com/livestream/'

response = requests.get(url, verify=False)

if response.status_code == 200:
    match = re.search(r"https://live.kwikmotion.com/alraimedialive/alraitv.smil/.*?\.m3u8\?hdnts=[^\"]+", response.text)
  
    if match:
        erstrm = match.group(0)  # Using group(0) to extract the full match
        # Print output in the specified format
        print("#EXTM3U")
        print("#EXT-X-VERSION:3")
        print("#EXT-X-STREAM-INF:BANDWIDTH=2126865,FRAME-RATE=25,RESOLUTION=1920x1080,CODECS="avc1.4d0028,mp4a.40.2",CLOSED-CAPTIONS=NONE")
        print(erstrm)
    else:
        print("erstrm not found in the content.")
else:
    print(f"Failed to fetch content. HTTP Status code: {response.status_code}")
