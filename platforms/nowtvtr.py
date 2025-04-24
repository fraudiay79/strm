import requests
from bs4 import BeautifulSoup
import re
import urllib3
import os

url = "http://www.nowtv.com.tr/canli-yayin"

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Directory to save output files
output_dir = "links"
os.makedirs(output_dir, exist_ok=True)

try:
    response = requests.get(url, verify=False)
    response.raise_for_status()
    html_content = response.text

    soup = BeautifulSoup(html_content, "html.parser")
    script_tag = soup.find('script', text=True)

    if script_tag:
	    script_content = script_tag.string or script_tag.text
        script_content = script_content.strip()
        match = re.search(r"daiUrl\s*:\s*'(https?://[^']+)'", script_content)
        if match:
            daiUrl = match.group(1)
            

            # Generate multiple resolution variations
            variations = {
                "nowtv_720p": (950000, 1050000, "720p", "1280x720"),
                "nowtv_480p": (700000, 800000, "480p", "854x480"),
                "nowtv_360p": (500000, 550000, "360p", "640x360"),
            }

            name = "nowtvtr"  # Define a base name for the file
            output_file = os.path.join(output_dir, f"nowtvtr.m3u8")

            with open(output_file, "w") as file:
                file.write("#EXTM3U\n")
                file.write("#EXT-X-VERSION:3\n")
                file.write("#EXT-X-INDEPENDENT-SEGMENTS\n")

                for variant, (bandwidth, avg_bandwidth, resolution, dimensions) in variations.items():
                    modified_link = daiUrl.replace("playlist", variant)
                    file.write(
                        f'#EXT-X-STREAM-INF:PROGRAM-ID=2850,AVERAGE-BANDWIDTH={avg_bandwidth},BANDWIDTH={bandwidth},NAME="{variant}",RESOLUTION={dimensions}\n'
                    )
                    file.write(f"{modified_link}\n")
        else:
            print("daiUrl not found.")
    else:
        print("No <script> tag with the required content found.")
except requests.exceptions.RequestException as e:
    print(f"An error occurred while fetching the URL: {e}")
