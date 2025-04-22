import requests

# URL to fetch JSON data
url = "https://vod.tvp.pl/api/products/399702/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER"

# Fetch JSON data from the API
try:
    response = requests.get(url)
    response.raise_for_status()
    data = response.json()
except requests.exceptions.RequestException as e:
    print(f"Error fetching data from API: {e}")
    exit()
except ValueError:
    print("Error: Invalid JSON response.")
    exit()

# Extract the mpd link from the JSON response
try:
    m3u8_link = data["sources"]["HLS"][0]["src"]
except (KeyError, IndexError):
    print("Error: Unable to retrieve 'HLS' m3u8 link from the JSON response.")
    exit()

# Path for the new m3u8 file
output_file = "links/tvpsport.m3u8"

# Write the m3u8 link into the new m3u8 file
try:
    with open(output_file, "w") as file:
        file.write("#EXTM3U\n")
        file.write("#EXT-X-STREAM-INF:BANDWIDTH=8000000\n")
        file.write(f"{m3u8_link}\n")

    #print(f"New m3u8 file created successfully: {output_file}")

except Exception as e:
    print(f"Error writing to the m3u8 file: {e}")
    exit()
