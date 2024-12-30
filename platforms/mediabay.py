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
            print("m3u8 URL not found")
            return None

    except Exception as e:
        print(f"An error occurred: {e}")
        return None

def create_m3u8_file(channel_info, file_name="tv.m3u8"):
    m3u_content = '#EXTM3U\n'
    
    for channel in channel_info:
        channel_name = channel['variables'][0]['value']
        m3u8_url = extract_m3u8_url(channel_name)

        if m3u8_url:
            m3u_content += f'#EXTINF:-1, {channel["name"]}\n{m3u8_url}\n'

    with codecs.open(file_name, "w", "utf-8") as file:
        file.write(m3u_content)
    print(f"M3U8 file '{file_name}' created with the extracted links")

# Read channel information from the JSON file
with open(json_file, 'r') as file:
    channel_data = json.load(file)

channels = channel_data[0]['channels']

# Create the M3U8 file
create_m3u8_file(channels)
