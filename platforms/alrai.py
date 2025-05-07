import requests
import re

base_url = "https://live.kwikmotion.com/alraimedialive/alraitv.smil/"
url = "https://www.alraimedia.com/livestream/"
response = requests.get(url)

if response.status_code == 200:
    site_content = response.text

    match = re.search(r'https://live.kwikmotion.com/alraimedialive/alraitv.smil/.*?\.m3u8\?hdnts=[^"]+', site_content)

    if match:
        m3u8_url = match.group(0)
        print(f"Extracted M3U8 URL: {m3u8_url}")

        # Fetch m3u8 content
        content_response = requests.get(m3u8_url)
        
        if content_response.status_code == 200:
            content = content_response.text
            lines = content.split("\n")
            modified_content = ""

            for line in lines:
                line = line.strip()
                if line.startswith("alraitvpublish"):
                    full_url = base_url + line
                    modified_content += full_url + "\n"
                else:
                    modified_content += line + "\n"

            print(modified_content)
        else:
            print("Failed to fetch m3u8 content.")
    else:
        print("Live stream URL not found in the page content.")
else:
    print("Failed to fetch the website content.")
