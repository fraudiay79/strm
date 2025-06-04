import requests
import re

url = 'https://www.nowtv.com.tr/canli-yayin'

response = requests.get(url, verify=False)

if response.status_code == 200:
    match = re.search(r"daiUrl\s*:\s*'(https?://[^\']+)'", response.text)
  
    if match:
        erstrm = match.group(1)

        # Print output in the specified format
        print("#EXTM3U")
        print("#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1280x720")
        print(erstrm)
    else:
        print("erstrm not found in the content.")
else:
    print(f"Failed to fetch content. HTTP Status code: {response.status_code}")
