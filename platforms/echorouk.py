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
                
                # Get the master m3u8 content
                m3u8_response = requests.get(m3u8_url, headers=headers)
                if m3u8_response.status_code == 200:
                    m3u8_content = m3u8_response.text
                    
                    # Check if this is a master playlist pointing to another m3u8
                    if 'chunks.m3u8' in m3u8_content:
                        # Extract the chunks.m3u8 URL
                        base_url = '/'.join(m3u8_url.split('/')[:-1]) + '/'
                        chunks_match = re.search(r'chunks\.m3u8[^\s]+', m3u8_content)
                        if chunks_match:
                            chunks_url = base_url + chunks_match.group(0)
                            print(f'Found chunks URL: {chunks_url}')
                            
                            # Save the final m3u8 URL to file
                            output_file = os.path.join(output_dir, f"{names[i]}.txt")
                            with open(output_file, 'w') as f:
                                f.write(chunks_url)
                            print(f'Saved to: {output_file}')
                        else:
                            print('Could not extract chunks.m3u8 URL from master playlist')
                    else:
                        # If it's already the final m3u8, save it directly
                        output_file = os.path.join(output_dir, f"{names[i]}.txt")
                        with open(output_file, 'w') as f:
                            f.write(m3u8_url)
                        print(f'Saved to: {output_file}')
                else:
                    print(f'Failed to retrieve m3u8 file. Status code: {m3u8_response.status_code}')
            else:
                print('No m3u8 URL found in the page.')
        else:
            print(f'Failed to retrieve the page. Status code: {response.status_code}')
    
    except Exception as e:
        print(f'Error processing {names[i]}: {e}')
    
    print('-' * 50)
