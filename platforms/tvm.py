import requests
import re
import os

# Directory to save output files
output_dir = "links/mt"
os.makedirs(output_dir, exist_ok=True)

# Common Headers
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    "Origin": "https://tvmi.mt",
    "Referer": "https://tvmi.mt/",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "en-US,en;q=0.9",
    "priority": "u=0, i",
    "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "upgrade-insecure-requests": "1"
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

# Ensure output directory exists only once
os.makedirs(output_dir, exist_ok=True)

# Process each URL and save to a separate .m3u8 file
for url, name in zip(urls, names):
    try:
        print(f"Processing URL: {url}")
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()  # Raise exception for HTTP errors
        output_file = os.path.join(output_dir, f"{name}.m3u8")

        if response.status_code == 200:
            site_content = response.text
            print(f"Content retrieved for {url}")

            match = re.search(r'data-jwt="(.*?)"', site_content)
            host_match = re.search(r'data-dist-host="(.*?)"', site_content)

            if not match:
                print(f"Error: JWT not found for {url}")
                continue
            if not host_match:
                print(f"Error: 'data-dist-host' not found for {url}")
                continue

            data_jwt_value = match.group(1)
            host_value = host_match.group(1)
            live_url_main = f"https://{host_value}/{data_jwt_value}/live/{url.split('/')[-1]}/0/index.m3u8"

            # Write to the file
            with open(output_file, "w") as file:
                file.write("#EXTM3U\n")
                file.write("#EXT-X-VERSION:3\n")
                file.write('#EXT-X-STREAM-INF:BANDWIDTH=1755600,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"\n')
                file.write(f"{live_url_main}|Referer=https://tvmi.mt/\n")

            print(f"Captured JWT for {url}: {data_jwt_value}")
            print(f"Generated {output_file} with live URL and Referer header.")

        else:
            print(f"Failed to fetch the website content for {url} (Status code: {response.status_code}).")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
