import requests
import re

base_url = "https://live.cdn.jurnaltv.md/JurnalTV_HD/"
url = "https://www.jurnaltv.md/page/live"
response = requests.get(url)

if response.status_code == 200:
    site_content = response.text
    match = re.search(r'file:\s*"(https.*?)"', site_content)
    
    if match:
        m3u8_url = match.group(1)
        #print(f"Location: {m3u8_url}")
        content_response = requests.get(m3u8_url)
        
        if content_response.status_code == 200:
            content = content_response.text
            lines = content.split("\n")
            modified_content = ""
            
            for line in lines:
                if line.startswith("tracks-"):
                    full_url = base_url + line
                    modified_content += full_url + "\n"
                else:
                    modified_content += line + "\n"
            
            print(modified_content)
        else:
            print("Failed to fetch content.")
    else:
        print("Live URL not found in the content.")
else:
    print("Failed to fetch the website content.")
