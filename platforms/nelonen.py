#!/usr/bin/env python3

import requests
import os
import json

def extract_stream_url(data, channel_name):
    """
    Extract the stream URL from the JSON response.
    """
    try:
        # For video-stream type (nelonen, hero)
        if data.get('type') == 'video-stream':
            if 'media' in data:
                media = data['media']
                # Try different possible locations for HLS stream
                if 'hls' in media:
                    return media['hls']
                elif 'url' in media:
                    return media['url']
                elif 'streams' in media and len(media['streams']) > 0:
                    # Look for HLS stream in streams array
                    for stream in media['streams']:
                        if stream.get('type') == 'hls' and 'url' in stream:
                            return stream['url']
                        elif 'url' in stream:
                            return stream['url']
        
        # For video type (jim, liv) - look in clip.playback
        elif data.get('type') == 'video':
            if 'clip' in data and 'playback' in data['clip']:
                playback = data['clip']['playback']
                if 'hls' in playback:
                    return playback['hls']
                elif 'url' in playback:
                    return playback['url']
                elif 'streams' in playback and len(playback['streams']) > 0:
                    for stream in playback['streams']:
                        if stream.get('type') == 'hls' and 'url' in stream:
                            return stream['url']
                        elif 'url' in stream:
                            return stream['url']
        
        # If we still haven't found it, print the full structure for debugging
        print(f"  Debug - Full media structure for {channel_name}:")
        if data.get('type') == 'video-stream' and 'media' in data:
            print(json.dumps(data['media'], indent=2)[:1000])
        elif data.get('type') == 'video' and 'clip' in data and 'playback' in data['clip']:
            print(json.dumps(data['clip']['playback'], indent=2)[:1000])
        
        print(f"  Could not find stream URL in response for {channel_name}")
        return None
            
    except Exception as e:
        print(f"  Error extracting stream URL for {channel_name}: {e}")
        return None

# Finnish channels configuration
names = ["jim", "nelonen", "liv", "hero"]
output_dir = "links/fi"
os.makedirs(output_dir, exist_ok=True)

# Create a session to maintain cookies and headers
s = requests.Session()

# Headers for the API request
headers = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7,ar-MA;q=0.6,ar;q=0.5',
    'cache-control': 'max-age=0',
    'priority': 'u=0, i',
    'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'cross-site',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    'referer': 'https://www.nelonenmedia.fi/'
}

# Update session headers
s.headers.update(headers)

# Process each Finnish channel
successful_channels = []
failed_channels = []

# Channel IDs mapping
channel_ids = {
    "jim": "2584964",
    "nelonen": "2584965", 
    "liv": "2584966",
    "hero": "2584967"
}

for channel_name in names:
    channel_id = channel_ids.get(channel_name)
    if not channel_id:
        print(f"  ✗ No ID found for channel: {channel_name}")
        failed_channels.append(channel_name)
        continue
    
    print(f"\nProcessing channel: {channel_name} (ID: {channel_id})")
    
    try:
        # Build API URL with channel ID
        api_url = f'https://mcc.nm-ovp.nelonenmedia.fi/v2/media/{channel_id}'
        
        # Fetch the JSON data
        print("  Fetching API data...")
        response = s.get(api_url)
        response.raise_for_status()
        
        data = response.json()
        print(f"  API response received for {channel_name}")
        print(f"  Response type: {data.get('type')}")
        
        # Extract stream URL from the response
        stream_url = extract_stream_url(data, channel_name)
        
        if not stream_url:
            print(f"  ✗ Could not extract stream URL for {channel_name}")
            failed_channels.append(channel_name)
            continue

        print(f'  Extracted stream URL: {stream_url}')

        # Fetch playlist content using the same session
        print("  Fetching playlist content...")
        playlist_response = s.get(stream_url)
        playlist_response.raise_for_status()
        
        playlist_content = playlist_response.text
        print(f"  Playlist response status: {playlist_response.status_code}")

        # Write to file
        output_file = f'{output_dir}/{channel_name}.m3u8'
        with open(output_file, 'w') as f:
            f.write(playlist_content)

        print(f'  ✓ Created: {output_file}')
        successful_channels.append(channel_name)

    except requests.exceptions.RequestException as e:
        print(f"  ✗ Error making request for {channel_name}: {e}")
        failed_channels.append(channel_name)
    except KeyError as e:
        print(f"  ✗ Error parsing JSON response for {channel_name}: {e}")
        failed_channels.append(channel_name)
    except Exception as e:
        print(f"  ✗ Unexpected error for {channel_name}: {e}")
        failed_channels.append(channel_name)

# Print summary
print(f"\n{'='*50}")
print("FINNISH CHANNELS SUMMARY:")
print(f"Successful: {len(successful_channels)} channels")
print(f"Failed: {len(failed_channels)} channels")

if successful_channels:
    print(f"\nSuccessful channels: {', '.join(successful_channels)}")
if failed_channels:
    print(f"Failed channels: {', '.join(failed_channels)}")

print(f"\nAll files saved to: {output_dir}/")
