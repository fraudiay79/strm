import requests
import re
import os

# Common Headers
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
    "Origin": "https://tvmi.mt",
    "Referer": "https://tvmi.mt/"
}

# List of URLs to process
urls = [
    "https://tvmi.mt/live/2",
    "https://tvmi.mt/live/3",
    "https://tvmi.mt/live/4"
]

# Corresponding names for the output files
names = [
    "tvm",
    "tvmnews",
    "tvmsport"
]

# Directory to save output files
output_dir = "links"
os.makedirs(output_dir, exist_ok=True)

# Process each URL and save to a separate .m3u8 file
for url, name in zip(urls, names):
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()  # Raise exception for HTTP errors
        output_file = os.path.join(output_dir, f"{name}.m3u8")

        if response.status_code == 200:
            site_content = response.text
            match = re.search(r'data-jwt="(.*?)"', site_content)

            with open(output_file, "w") as file:
                # Write M3U headers
                file.write("#EXTM3U\n")
                file.write("#EXT-X-VERSION:3\n")
                file.write('#EXT-X-STREAM-INF:BANDWIDTH=1755600,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"\n')

                # Write the URL with the Referer header
                if match:
                    data_jwt_value = match.group(1)
                    live_url_main = f"https://dist9.tvmi.mt/{data_jwt_value}/live/{url.split('/')[-1]}/0/index.m3u8"
                    file.write(f"{live_url_main}|Referer=https://tvmi.mt/\n")
                    print(f"Generated {output_file} with live URL and Referer header.")
                else:
                    file.write(f"# Error: Live URL not found for {url}\n")
                    print(f"Live URL not found for {url}.")
        else:
            print(f"Failed to fetch the website content for {url}.")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
