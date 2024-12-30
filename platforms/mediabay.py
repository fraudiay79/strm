# -*- coding: utf-8 -*-
import common
import os

# Create the 'links' directory if it doesn't exist
output_dir = 'links'
os.makedirs(output_dir, exist_ok=True)

def Resolve(channel):
    url = 'https://api.mediabay.tv/v2/channels/thread/90'  # URL is now fixed to channel 90
    UA = common.GetUserAgent()
    headers = {'User-Agent': UA}
    prms = common.OpenURL(url, headers=headers, responseMethod='json')
    m3u8_url = prms['data'][0]['threadAddress']
    
    # Print the m3u8 URL
    print(f"m3u8 URL: {m3u8_url}")

    # Create and save the M3U8 file
    create_m3u8_file(m3u8_url, channel)

def create_m3u8_file(m3u8_url, channel):
    if not m3u8_url:
        print(f"No m3u8 URL found for channel {channel}")
        return

    # Example M3U8 content structure
    m3u8_content = f"""#EXTM3U
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=1360000,BANDWIDTH=1710000,RESOLUTION=640x360,FRAME-RATE=25.000,CODECS="avc1.4d001e,mp4a.40.2",CLOSED-CAPTIONS=NONE
{m3u8_url}
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=2420000,BANDWIDTH=3020000,RESOLUTION=854x480,FRAME-RATE=25.000,CODECS="avc1.4d001e,mp4a.40.2",CLOSED-CAPTIONS=NONE
{m3u8_url}
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=4300000,BANDWIDTH=5380000,RESOLUTION=1280x720,FRAME-RATE=25.000,CODECS="avc1.4d001f,mp4a.40.2",CLOSED-CAPTIONS=NONE
{m3u8_url}
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=6410000,BANDWIDTH=8010000,RESOLUTION=1920x1080,FRAME-RATE=25.000,CODECS="avc1.4d0028,mp4a.40.2",CLOSED-CAPTIONS=NONE
{m3u8_url}
"""
    file_name = os.path.join(output_dir, f"{channel}.m3u8")
    with open(file_name, "w") as file:
        file.write(m3u8_content)
    print(f"M3U8 file '{file_name}' created with the link: {m3u8_url}")
