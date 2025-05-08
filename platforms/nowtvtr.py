import requests
import re

url = 'https://www.nowtv.com.tr/canli-yayin'

response = requests.get(url, verify=False)

if response.status_code == 200:
    match = re.search(r"daiUrl\s*:\s*'(https?://[^\']+)'", response.text)
  
    if match:
        m3u8_url = match.group(1)  # Extracted M3U8 URL
        # print(f"Extracted M3U8 URL: {m3u8_url}")

        # Fetch m3u8 content
        content_response = requests.get(m3u8_url)

        if content_response.status_code == 200:
            content = content_response.text
            lines = content.split("\n")
            modified_content = ""

            base_url = m3u8_url.rsplit('/', 1)[0]  # Extract the base URL

            for line in lines:
                line = line.strip()
                if line.startswith("nowtv"):
                    full_url = f"{base_url}/{line}"
                    modified_content += full_url + "\n"
                else:
                    modified_content += line + "\n"

            print(modified_content)
        else:
            print("Failed to fetch m3u8 content.")
    else:
        print("Live stream URL not found in the page content.")
else:
    print(f"Failed to fetch content. HTTP Status code: {response.status_code}")
