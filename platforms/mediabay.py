import urllib.request
import json
import os

# Create the 'mediabay' directory if it doesn't exist
output_dir = 'mediabay'
os.makedirs(output_dir, exist_ok=True)

def fetch_country_channels():
    url = "https://api.mediabay.tv/v2/countrychannels"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
    }
    try:
        # Create a request with headers
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return data['data']
    except Exception as e:
        print(f"An error occurred while fetching country channels: {e}")
        return []

def fetch_m3u8_url(channel_id):
    url = f"https://api.mediabay.tv/v2/channels/thread/{channel_id}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
    }
    try:
        # Create a request with headers
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return data['data'][0]['threadAddress']
    except Exception as e:
        print(f"An error occurred while fetching m3u8 URL for channel {channel_id}: {e}")
        return None

def create_m3u8_file(m3u8_url, channel_id):
    if not m3u8_url:
        print(f"No m3u8 URL found for channel {channel_id}")
        return

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

    file_name = os.path.join(output_dir, f"{channel_id}.m3u8")
    with open(file_name, "w") as file:
        file.write(m3u8_content)
    print(f"M3U8 file '{file_name}' created with the link: {m3u8_url}")

# Main script logic
def main():
    channels = fetch_country_channels()
    for channel in channels:
        channel_id = channel['id']
        m3u8_url = fetch_m3u8_url(channel_id)
        create_m3u8_file(m3u8_url, channel_id)

if __name__ == "__main__":
    main()