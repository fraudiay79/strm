import requests
import xml.etree.ElementTree as ET
import re

# Define the URL
url = "https://www.giniko.com/xml/secure/plist.php?ch=440"

# Define the headers
headers = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "en-US,en;q=0.9",
    "sec-ch-ua": "\"Chromium\";v=\"136\", \"Google Chrome\";v=\"136\", \"Not.A/Brand\";v=\"99\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1"
}

# Fetch the XML data with headers
response = requests.get(url, headers=headers)
if response.status_code == 200:
    xml_data = response.text

    # Parse the XML
    root = ET.fromstring(xml_data)

    # Find the first M3U8 URL
    m3u8_url = None
    for element in root.findall(".//string"):
        if "m3u8" in element.text:
            m3u8_url = element.text
            break

    if m3u8_url:
        #print(f"Extracted M3U8 URL: {m3u8_url}")

        # Fetch the M3U8 content
        content_response = requests.get(m3u8_url)

        if content_response.status_code == 200:
            content = content_response.text
            lines = content.split("\n")
            modified_content = ""

            # Extract base URL
            base_url_match = re.match(r"(https://.*/)", m3u8_url)
            base_url = base_url_match.group(1) if base_url_match else ""

            # Modify M3U8 content
            for line in lines:
                line = line.strip()
                if line.startswith("tracks-"):
                    full_url = base_url + line
                    modified_content += full_url + "\n"
                else:
                    modified_content += line + "\n"

            print(modified_content)
        else:
            print("Failed to fetch M3U8 content.")
    else:
        print("Live stream URL not found in the XML data.")
else:
    print("Failed to retrieve XML data. Status Code:", response.status_code)
