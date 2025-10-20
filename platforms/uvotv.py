#!/bin/bash

# Directory to save output files
output_dir="links/ng"
mkdir -p "$output_dir"

python3 -c "
import requests
import json

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
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
}

# Cookies
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

# Fetch the JSON data
api_url = 'https://uvotv.com/api/web/live-channels/v2/1139/url'
response = requests.get(api_url, headers=headers, cookies=cookies)
data = response.json()

playback_url = data['payload']['playbackUrl']
print(f'Extracted playback URL: {playback_url}')

# Extract base URL
base_url = playback_url.split('playlist.m3u8')[0]

# Fetch playlist content
playlist_response = requests.get(playback_url)
playlist_content = playlist_response.text

# Extract header and relative path
lines = playlist_content.strip().split('\n')
header_lines = [line for line in lines if line.startswith('#')]
relative_path = [line for line in lines if not line.startswith('#')][0]

# Construct final URL
final_url = base_url + relative_path

# Write to file
output_file = 'links/ng/channels_tv.m3u8'
with open(output_file, 'w') as f:
    f.write('\n'.join(header_lines) + '\n')
    f.write(final_url + '\n')

print(f'Final m3u8 file created: {output_file}')
print(f'Final URL: {final_url}')
"

echo "Script completed successfully!"
