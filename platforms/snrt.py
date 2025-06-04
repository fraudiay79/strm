import requests
import re
import os

# Directory to save output files
output_dir = "links/ma"
os.makedirs(output_dir, exist_ok=True)

# List of URLs and corresponding names
urls = [
    "https://token.easybroadcast.io/all?url=https://cdn.live.easybroadcast.io/abr_corp/73_aloula_w1dqfwm/playlist_dvr.m3u8",
    "https://token.easybroadcast.io/all?url=https://cdn.live.easybroadcast.io/abr_corp/73_arryadia_k2tgcj0/playlist_dvr.m3u8",
    "https://token.easybroadcast.io/all?url=https://cdn.live.easybroadcast.io/abr_corp/73_arrabia_hthcj4p/playlist_dvr.m3u8",
    "https://token.easybroadcast.io/all?url=https://cdn.live.easybroadcast.io/abr_corp/73_almaghribia_83tz85q/playlist_dvr.m3u8",
    "https://token.easybroadcast.io/all?url=https://cdn.live.easybroadcast.io/abr_corp/73_assadissa_7b7u5n1/playlist_dvr.m3u8",
    "https://token.easybroadcast.io/all?url=https://cdn.live.easybroadcast.io/abr_corp/73_tamazight_tccybxt/playlist_dvr.m3u8",
    "https://token.easybroadcast.io/all?url=https://cdn.live.easybroadcast.io/abr_corp/73_laayoune_pgagr52/playlist_dvr.m3u8"
]

# Corresponding names for the output files
names = [
    "aloula", "arryadia", "athaqafia", "almaghribia", "assadissa", "tamazight", "laayoune"
]

# Loop through URLs
for url, name in zip(urls, names):
    response = requests.get(url, verify=False)

    if response.status_code == 200:
        # Extract token parameters
        match = re.search(r'token=([\w\-]+)&token_path=([^&]+)&expires=(\d+)', response.text)

        if match:
            token = match.group(1)
            token_path = match.group(2)
            expires = match.group(3)

            # Construct the final stream URL
            final_url = f"https://cdn.live.easybroadcast.io/abr_corp/{name}/playlist_dvr.m3u8?token={token}&token_path={token_path}&expires={expires}"

            # Save to file
            file_path = os.path.join(output_dir, f"{name}.m3u8")
            with open(file_path, "w") as f:
                f.write("#EXTM3U\n")
                f.write("#EXT-X-VERSION:3\n")
                f.write("#EXT-X-STREAM-INF:PROGRAM-ID=1\n")
                f.write(final_url + "\n")

            print(f"Saved: {file_path}")
        else:
            print(f"Token not found for {name}")
    else:
        print(f"Failed to fetch content for {name}. HTTP Status code: {response.status_code}")
