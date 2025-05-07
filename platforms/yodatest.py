import requests
import re

# Directory to save output files
output_dir = "links/test"
os.makedirs(output_dir, exist_ok=True)

names = ["aztv", "xazar"]
url = "https://yodaplayer.yodacdn.net/"

response = requests.get(url)

if response.status_code == 200:
    site_content = response.text

    match = re.search(r'data-token="(.*?)"', site_content)

    if match:
        token = match.group(0)

        for name in names:
            m3u8_url = f"https://str.yodacdn.net/{name}/video.m3u8?token={token}"
            print(f"Extracted M3U8 URL for {name}: {m3u8_url}")

            # Fetch m3u8 content
            content_response = requests.get(m3u8_url)
            
            if content_response.status_code == 200:
                content = content_response.text
                lines = content.split("\n")
                modified_content = ""

                for line in lines:
                    line = line.strip()
                    if line.startswith("tracks"):
                        full_url = f"https://str.yodacdn.net/{name}/" + line
                        modified_content += full_url + "\n"
                    else:
                        modified_content += line + "\n"

                print(f"\n--- Modified M3U8 Content for {name} ---\n")
                print(modified_content)
            else:
                print(f"Failed to fetch m3u8 content for {name}.")
    else:
        print("Live stream token not found in the page content.")
else:
    print("Failed to fetch the website content.")
