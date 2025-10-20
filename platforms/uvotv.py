#!/usr/bin/env python3

import requests
import os
import json

# Directory to save output files
output_dir = "links/uvo"
os.makedirs(output_dir, exist_ok=True)

# Read the uvo.json file - it's located in links/uvo directory
json_file_path = os.path.join(output_dir, 'uvo.json')

try:
    with open(json_file_path, 'r') as f:
        channels = json.load(f)
    print(f"Loaded {len(channels)} channels from {json_file_path}")
except FileNotFoundError:
    print(f"Error: uvo.json file not found at {json_file_path}")
    exit(1)
except json.JSONDecodeError as e:
    print(f"Error parsing uvo.json: {e}")
    exit(1)

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
    'referer': 'https://uvotv.com/'
}

# Update session headers
s.headers.update(headers)

# Cookies to set
cookies = {
    '_gcl_au': '1.1.1977328394.1759494547',
    '_ga': 'GA1.1.151876816.1759494547',
    'session-GUID': 'b16e9f01-ec53-4ed3-8969-c4999437415a',
    'ovp.sid': 's%3A2RczUtjnxYRwy0xIfbmV_cAvcVRWlyT2.wCHmRqanTzw8o2kUlDAINuU%2F71jyWxNoxjBlnpdRB0M',
    '_scid': 'FbhIa63nhiL--hmqLw-M_u7NBOxUIfEW',
    '_tt_enable_cookie': '1',
    '_ttp': '01K6N0RA8DRGKTPEMEDDPRQNVK_.tt.1',
    '_ym_uid': '1759494548154782380',
    '_ym_d': '1759494548',
    '_ScCbts': '%5B%5D',
    '_sctr': '1%7C1760414400000',
    '_scid_r': 'LzhIa63nhiL--hmqLw-M_u7NBOxUIfEW6veZTQ',
    '_ym_isad': '1',
    'ttcsid': '1760961684258::JD1I7VmIEx1W-ceVGVZT.14.1760961698322.0',
    'ttcsid_CUGACIJC77U8E2TJIKF0': '1760961684257::gxMbl1GC2BpWej9539oC.14.1760961698322.0',
    '_ga_VHYF8SPDF4': 'GS2.1.s1760961683$o12$g1$t1760961863$j60$l0$h336694408',
    '_ga_9EXRJ4BBQD': 'GS2.1.s1760961683$o12$g1$t1760961920$j60$l0$h0'
}

# Update session cookies
s.cookies.update(cookies)

# Process each channel
successful_channels = []
failed_channels = []

for channel in channels:
    channel_id = channel['id']
    channel_name = channel['name']
    
    print(f"\nProcessing channel: {channel_name} (ID: {channel_id})")
    
    try:
        # Build API URL with channel ID
        api_url = f'https://uvotv.com/api/web/live-channels/v2/{channel_id}/url'
        
        # Fetch the JSON data
        print("  Fetching API data...")
        response = s.get(api_url)
        response.raise_for_status()
        
        data = response.json()
        playback_url = data['payload']['playbackUrl']
        print(f'  Extracted playback URL: {playback_url}')

        # Extract base URL
        base_url = playback_url.split('playlist.m3u8')[0]

        # Fetch playlist content using the same session
        print("  Fetching playlist content...")
        playlist_response = s.get(playback_url)
        playlist_response.raise_for_status()
        
        playlist_content = playlist_response.text
        print(f"  Playlist response status: {playlist_response.status_code}")

        # Extract header and relative path
        lines = playlist_content.strip().split('\n')
        header_lines = [line for line in lines if line.startswith('#')]
        
        if not header_lines:
            print(f"  Warning: No header lines found in playlist for {channel_name}")
            continue
            
        relative_path_lines = [line for line in lines if not line.startswith('#') and line.strip()]
        
        if not relative_path_lines:
            print(f"  Warning: No stream URLs found in playlist for {channel_name}")
            continue
            
        relative_path = relative_path_lines[0]

        # Construct final URL
        final_url = base_url + relative_path

        # Write to file
        output_file = f'{output_dir}/{channel_name}.m3u8'
        with open(output_file, 'w') as f:
            f.write('\n'.join(header_lines) + '\n')
            f.write(final_url + '\n')

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
print("SUMMARY:")
print(f"Successful: {len(successful_channels)} channels")
print(f"Failed: {len(failed_channels)} channels")

if successful_channels:
    print(f"\nSuccessful channels: {', '.join(successful_channels)}")
if failed_channels:
    print(f"Failed channels: {', '.join(failed_channels)}")

print(f"\nAll files saved to: {output_dir}/")
