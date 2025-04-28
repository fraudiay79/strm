def extract_hls_stream_url(response_text):
    """
    Extract the HlsStreamURL key value from the XML or HTML response
    """
    try:
        # Log the response for debugging
        print("Response content for debugging:")
        print(response_text)

        # Parse the XML content
        root = ET.fromstring(response_text)
        for elem in root.iter("string"):
            if "HlsStreamURL" in elem.tag or "HlsStreamURL" in elem.text:
                print(f"Found HlsStreamURL: {elem.text}")
                return elem.text
        print("HlsStreamURL not found in the response.")
        return None
    except Exception as e:
        print(f"Error parsing HLS stream URL: {e}")
        return None
