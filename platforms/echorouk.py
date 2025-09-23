import requests
import re
import os

urls = ['https://live.dzsecurity.net/live/player/echorouktv', 'https://live.dzsecurity.net/live/player/echorouknews']
names = ["echorouktv", "echorouknews"]
referer = 'https://www.echoroukonline.com/'

headers = {
    'Referer': referer,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# Directory to save output files
output_dir = "links/dz"
os.makedirs(output_dir, exist_ok=True)

for i, url in enumerate(urls):
    print(f"Processing {names[i]}...")
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            # Look for the m3u8 URL in the JavaScript code
            m3u8_url_match = re.search(
                r'src:\s*location\.protocol\s*\+\s*["\']([^"\']+\.m3u8\?[^"\']+)["\']',
                response.text
            )
            
            if not m3u8_url_match:
                # Alternative pattern if the first one doesn't match
                m3u8_url_match = re.search(
                    r'["\'](//[^"\']+\.m3u8\?[^"\']+)["\']',
                    response.text
                )
            
            if m3u8_url_match:
                m3u8_url = f'https:{m3u8_url_match.group(1)}'
                print(f'Found m3u8 URL: {m3u8_url}')
                
                # Create the m3u8 playlist content
                m3u8_content = f"""#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=992257,RESOLUTION=1920x1080,CODECS="avc1.4d402a,mp4a.40.2"
{m3u8_url}"""
                
                # Save as .m3u8 file
                output_file = os.path.join(output_dir, f"{names[i]}.m3u8")
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(m3u8_content)
                print(f'Saved m3u8 playlist to: {output_file}')
                
            else:
                print('No m3u8 URL found in the page.')
        else:
            print(f'Failed to retrieve the page. Status code: {response.status_code}')
    
    except Exception as e:
        print(f'Error processing {names[i]}: {e}')
    
    print('-' * 50)

print("All channels processed!")
