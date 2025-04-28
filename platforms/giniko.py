# -*- coding: utf-8 -*-
import requests
import xml.etree.ElementTree as ET

def fetch_m3u8_url(url):
    """
    Fetch and parse the XML content to retrieve the full m3u8 URL containing 'index.m3u8'
    """
    try:
        # Fetch XML content from the URL
        response = requests.get(url)
        response.raise_for_status()

        # Parse the XML content
        root = ET.fromstring(response.text)

        # Iterate through <dict> elements to find the 'HlsStreamURL'
        for channel_dict in root.findall(".//dict"):
            hls_stream_url = None
            for key_elem in channel_dict.findall("key"):
                if key_elem.text == "HlsStreamURL":
                    # Get the corresponding <string> value
                    value_elem = key_elem.getnext()
                    if value_elem is not None and "index.m3u8" in value_elem.text:
                        hls_stream_url = value_elem.text
                        return hls_stream_url

        print("No m3u8 URL containing 'index.m3u8' was found.")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL {url}: {e}")
        return None
    except ET.ParseError as e:
        print(f"Error parsing XML content: {e}")
        return None

# Main entry point
if __name__ == "__main__":
    # URL to access
    url = "https://www.giniko.com/xml/secure/plist.php?ch=440"

    # Retrieve the m3u8 URL
    m3u8_url = fetch_m3u8_url(url)

    # Print the result
    if m3u8_url:
        print(f"Found m3u8 URL: {m3u8_url}")
