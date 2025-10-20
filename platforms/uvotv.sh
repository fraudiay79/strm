#!/bin/bash

# Directory to save output files
output_dir="links/ng"
mkdir -p "$output_dir"

API_URL="https://uvotv.com/api/web/live-channels/v2/1139/url"

# Extract playback URL and create final m3u8 in one go
curl -s "$API_URL" | \
python3 -c "
import json, sys, urllib.request
data = json.load(sys.stdin)
playback_url = data['payload']['playbackUrl']
base_url = playback_url.split('playlist.m3u8')[0]

# Fetch playlist content
with urllib.request.urlopen(playback_url) as response:
    playlist_content = response.read().decode('utf-8')
    lines = playlist_content.strip().split('\n')
    header = [line for line in lines if line.startswith('#')]
    relative_path = [line for line in lines if not line.startswith('#')][0]
    final_url = base_url + relative_path
    
    # Output final m3u8 to file
    with open('$output_dir/channels_tv.m3u8', 'w') as f:
        f.write('\n'.join(header) + '\n')
        f.write(final_url + '\n')
"

echo "Final playlist created: $output_dir/channels_tv.m3u8"
