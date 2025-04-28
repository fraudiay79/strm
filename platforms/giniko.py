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
            keys = channel_dict.findall("key")
            values = channel_dict.findall("string")
            for i, key_elem in enumerate(keys):
                if key_elem.text == "HlsStreamURL" and i < len(values):
                    value_elem = values[i]  # Get the corresponding <string> value
                    if "index.m3u8" in value_elem.text:
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
