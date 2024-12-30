import urllib.request
import json
import codecs
import os

# JSON file containing channel information
json_file = 'mediabay.json'

# Create the 'links' directory if it doesn't exist
output_dir = 'links'
os.makedirs(output_dir, exist_ok=True)

def extract_m3u8_url(channel_name):
    api_url = f"https://api.mediabay.tv/v2/channels/thread/{channel_name}"
    try:
        # Fetch data from the API
        with urllib.request.urlopen(api_url) as url:
            data = json.loads(url.read().decode())

        # Extract the m3u8 URL from the JSON response
        m3u8_url = data.get('data', [])[0].get('threadAddress', '')
        if not m3u8_url:
            print(f"m3u8 URL not found for channel: {channel_name}")
            return None

        # Modify URL based on bandwidth
        if 'playlist.m3u8' in m3u8_url:
            # Example data includes bandwidth information
            bandwidth = determine_bandwidth(data.get('data', [])[0])

            if bandwidth == 1710000:
                m3u8_url = m3u8_url.replace('playlist.m3u8', 'tracks-v4a1/mono.m3u8')
            elif bandwidth == 3020000:
                m3u8_url = m3u8_url.replace('playlist.m3u8', 'tracks-v3a1/mono.m3u8')
            elif bandwidth == 5380000:
                m3u8_url = m3u8_url.replace('playlist.m3u8', 'tracks-v2a1/mono.m3u8')
            elif bandwidth == 8010000:
                m3u8_url = m3u8_url.replace('playlist.m3u8', 'tracks-v1a1/mono.m3u8')

        return m3u8_url

    except Exception as e:
        print(f"An error occurred while fetching channel {channel_name}: {e}")
        return None

def determine_bandwidth(data):
    # This function should be adapted based on how bandwidth is determined in the response data
    # Assuming the data structure contains bandwidth information like this
    return data.get('bandwidth', None)

def create_m3u8_file(m3u8_url, channel_name):
    if not m3u8_url:
        print(f"No m3u8 URL found for channel {channel_name}")
        return

    # Example M3U8 content structure
    example_m3u8_content = f"""#EXTM3U
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=1360000,BANDWIDTH=1710000,RESOLUTION=640x360,FRAME-RATE=25.000,CODECS="avc1.4d001e,mp4a.40.2",CLOSED-CAPTIONS=NONE
{m3u8_url}
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=2420000,BANDWIDTH=3020000,RESOLUTION=854x480,FRAME-RATE=25.000,CODECS="avc1.4d001e,mp4a.40.2",CLOSED-CAPTIONS=NONE
{m3u8_url}
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=4300000,BANDWIDTH=5380000,RESOLUTION=1280x720,FRAME-RATE=25.000,CODECS="avc1.4d001f,mp4a.40.2",CLOSED-CAPTIONS=NONE
{m3u8_url}
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=6410000,BANDWIDTH=8010000,RESOLUTION=1920x1080,FRAME-RATE=25.000,CODECS="avc1.4d0028,mp4a.40.2",CLOSED-CAPTIONS=NONE
{m3u8_url}
"""

    file_name = os.path.join(output_dir, f"{channel_name}.m3u8")
    with codecs.open(file_name, "w", "utf-8") as file:
        file.write(example_m3u8_content)
    print(f"M3U8 file '{file_name}' created with the link: {m3u8_url}")

# Read channel information from the JSON file
with open(json_file, 'r') as file:
    channel_data = json.load(file)

channels = channel_data[0]['channels']

# Create an M3U8 file for each channel
for channel in channels:
    channel_name = channel['variables'][0]['value']
    m3u8_url = extract_m3u8_url(channel_name)
    create_m3u8_file(m3u8_url, channel_name)
