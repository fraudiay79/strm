import urllib.request
import json
import codecs

# JSON file containing channel information
json_file = 'mediabay.json'

def extract_m3u8_url(channel_name):
    api_url = f"https://api.mediabay.tv/v2/channels/thread/{channel_name}"
    try:
        # Fetch data from the API
        with urllib.request.urlopen(api_url) as url:
            data = json.loads(url.read().decode())

        # Extract the m3u8 URL from the JSON response
        m3u8_url = data.get('data', [])[0].get('threadAddress', '')

        if m3u8_url:
            return m3u8_url
        else:
            print(f"m3u8 URL not found for channel: {channel_name}")
            return None

    except Exception as e:
        print(f"An error occurred while fetching channel {channel_name}: {e}")
        return None

def create_m3u8_file(m3u8_url, channel_name):
    if not m3u8_url:
        print(f"No m3u8 URL found for channel {channel_name}")
        return

    # Create the M3U8 file with the extracted link
    file_name = f"{channel_name}.m3u8"
    m3u_content = '#EXTM3U\n'
    m3u_content += f'#EXTINF:-1, {channel_name}\n{m3u8_url}\n'

    with codecs.open(file_name, "w", "utf-8") as file:
        file.write(m3u_content)
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
