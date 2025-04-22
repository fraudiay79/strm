import requests
import os

# List of URLs to fetch JSON data
urls = [
    "https://vod.tvp.pl/api/products/399697/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399698/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399702/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399703/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399701/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399700/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399729/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399721/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399728/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/1998766/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399704/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399727/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399726/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399725/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399724/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399723/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER",
    "https://vod.tvp.pl/api/products/399722/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER"
]

# Corresponding names for the output files
names = ["tvp1", "tvp2", "tvpsport", "tvphistoria", "tvpkobieta", "tvpkultura", "belsat", "tvpdokument", tvpkultura2", tvpnadobre", "tvpabc", "tvpabc2", "alfatvp", "tvphistoria", "tvprozrywka", "tvppolonia", "tvpnauka" ]

# Directory to save output files
output_dir = "links"
os.makedirs(output_dir, exist_ok=True)

# Loop through URLs and names
for url, name in zip(urls, names):
    try:
        # Fetch JSON data from the API
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from URL {url}: {e}")
        continue
    except ValueError:
        print(f"Error: Invalid JSON response from URL {url}.")
        continue

    # Extract the HLS m3u8 link from the JSON response
    try:
        m3u8_link = data["sources"]["HLS"][0]["src"]
    except (KeyError, IndexError):
        print(f"Error: Unable to retrieve 'HLS' m3u8 link from URL {url}.")
        continue

    # Generate output file name
    output_file = os.path.join(output_dir, f"{name}.m3u8")

    # Write the m3u8 link into the new file
    try:
        with open(output_file, "w") as file:
            file.write("#EXTM3U\n")
            file.write("#EXT-X-STREAM-INF:BANDWIDTH=8000000\n")
            file.write(f"{m3u8_link}\n")
        #print(f"File created successfully: {output_file}")
    except Exception as e:
        print(f"Error writing to file {output_file}: {e}")
