import requests
from bs4 import BeautifulSoup

# URL to fetch the HTML content
url = "https://www.alraimedia.com/livestream/"

try:
    # Fetch the HTML content from the page
    response = requests.get(
        url,
        headers={
            "Cache-Control": "no-cache",
            "Origin": "https://www.alraimedia.com",
            "Referer": "https://www.alraimedia.com/",
        },
        timeout=10  # Add timeout to handle long response times
    )
    response.raise_for_status()  # Raise an exception for HTTP errors
    html_content = response.text

    # Parse the HTML content
    soup = BeautifulSoup(html_content, "html.parser")

    # Extract the 'file' URL from the <script> tag
    script_tag = soup.find("script", text=lambda t: t and "file:" in t)
    if script_tag and "file:" in script_tag.text:  # Verify the tag content
        start_index = script_tag.text.find('file:"') + len('file:"')
        end_index = script_tag.text.find('",', start_index)
        m3u8_url = script_tag.text[start_index:end_index]

        if m3u8_url and "?hdnts=" in m3u8_url:  # Ensure URL and token exist
            token = m3u8_url.split("?hdnts=")[-1]

            # Print the updated playlist
            print("#EXTM3U")
            print(
                f'EXT-X-STREAM-INF:BANDWIDTH=6400000,CODECS="avc1.42c028,mp4a.40.2",RESOLUTION=1920x1080'
            )
            print(
                f"https://live.kwikmotion.com/alraimedialive/alraitv.smil/playlist.m3u8?hdnts={token}"
            )
        else:
            print("Token not found in the m3u8 URL.")
    else:
        print("No suitable <script> tag found on the page or tag content invalid.")
except requests.RequestException as e:
    print(f"Failed to fetch the page: {e}")
except Exception as e:
    print(f"An error occurred: {e}")
