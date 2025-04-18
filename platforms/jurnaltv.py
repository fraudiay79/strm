import requests
from bs4 import BeautifulSoup

# URL to fetch the JSON data
url = "https://www.jurnaltv.md/page/live"

# Fetch the HTML content from the page
response = requests.get(url)
html_content = response.text

# Parse the HTML content
soup = BeautifulSoup(html_content, "html.parser")

# Extract the 'file' URL from the <script> tag
script_tag = soup.find("script", text=lambda t: t and "file:" in t)
start_index = script_tag.text.find('file:"') + len('file:"')
end_index = script_tag.text.find('",', start_index)
m3u8_url = script_tag.text[start_index:end_index]

# Extract the token value from the 'file' URL
token = m3u8_url.split("?token=")[-1]

# Print the updated playlist
print("#EXTM3U")
print(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=1750000,BANDWIDTH=2190000,RESOLUTION=640x360,FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE')
print(f"https://live.cdn.jurnaltv.md/JurnalTV_HD/tracks-v2a1/mono.ts.m3u8?token={token}")
print(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=2810000,BANDWIDTH=3510000,RESOLUTION=1024x576,FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE')
print(f"https://live.cdn.jurnaltv.md/JurnalTV_HD/tracks-v1a1/mono.ts.m3u8?token={token}")
