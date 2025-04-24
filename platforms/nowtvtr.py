import requests
from bs4 import BeautifulSoup
import re
import urllib3
import os

# URL to fetch
url = "http://www.nowtv.com.tr/canli-yayin"

# Disable warnings for unverified HTTPS requests
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Directory to save output files
output_dir = "links"
os.makedirs(output_dir, exist_ok=True)

try:
    # Fetch the HTML content from the URL
    response = requests.get(url, verify=False)
    response.raise_for_status()
    html_content = response.text

    # Parse the HTML using BeautifulSoup
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Find the <script> tag containing JavaScript
    script_tag = soup.find('script', text=True)

    if script_tag:
        # Extract the script content
        script_content = script_tag.string or script_tag.text
        script_content = script_content.strip()

        # Debugging: Print the script content to verify it includes daiUrl
        print("Script Content:", script_content[:500])  # Print first 500 characters

        # Use regex to extract daiUrl
        match = re.search(r"daiUrl\s*:\s*'(https?://[^']+)'", script_content)
        if match:
            daiUrl = match.group(1)
            print("Extracted daiUrl:", daiUrl)

            # Define resolution variations
            variations = {
                "nowtv_720p": (950000, 1050000, "720p", "1280x720"),
                "nowtv_480p": (700000, 800000, "480p", "854x480"),
                "nowtv_360p": (500000, 550000, "360p", "640x360"),
            }

            # Define a base name for the output file
            name = "nowtvtr"
            output_file = os.path.join(output_dir, f"{name}.m3u8")

            # Write the playlist file with multiple resolution variants
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
            print("daiUrl not found in the script content.")
    else:
        print("No <script> tag with the required content found.")
except requests.exceptions.RequestException as e:
    # Handle network-related exceptions
    print(f"An error occurred while fetching the URL: {e}")
