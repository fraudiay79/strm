import requests
import os

headers = {
    "Referer": "https://www.tdmax.com/",
    "Origin": "https://www.tdmax.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
}

# Create session object
s = requests.Session()
s.headers.update(headers)

# Disable SSL warnings
requests.packages.urllib3.disable_warnings()

# URLs to fetch
urls = [
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/6615734a8f081c7782f7652c/r/61316705e4b0295f87dae396/playlist.m3u8?withCredentials=false&lowBitrate=true&doNotUseRedirect=true&country_code=US",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/65faeea68f08e1eb79bdd7b5/r/61316705e4b0295f87dae396/playlist.m3u8?withCredentials=false&lowBitrate=true&doNotUseRedirect=true&country_code=US",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/66158e288f081c7782f7784c/r/61316705e4b0295f87dae396/playlist.m3u8?withCredentials=false&lowBitrate=true&doNotUseRedirect=true&country_code=US",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/65faeee28f08e1eb79bdd7b7/r/61316705e4b0295f87dae396/playlist.m3u8?withCredentials=false&lowBitrate=true&doNotUseRedirect=true&country_code=US",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/665a615c8f089605d9a00a91/r/61316705e4b0295f87dae396/playlist.m3u8?withCredentials=false&lowBitrate=true&doNotUseRedirect=true&country_code=US",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/65faeefb8f08e1eb79bdd7ba/r/61316705e4b0295f87dae396/playlist.m3u8?withCredentials=false&lowBitrate=true&doNotUseRedirect=true&country_code=US",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/66158e4b8f081c7782f77850/r/61316705e4b0295f87dae396/playlist.m3u8?withCredentials=false&lowBitrate=true&doNotUseRedirect=true&country_code=US",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/668735858f0892aad1eb7762/r/61316705e4b0295f87dae396/playlist.m3u8?withCredentials=false&lowBitrate=true&doNotUseRedirect=true&country_code=US",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/661572708f081c7782f762bd/r/61316705e4b0295f87dae396/playlist.m3u8?withCredentials=false&lowBitrate=true&doNotUseRedirect=true&country_code=US",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/6687350b8f0892aad1eb7757/r/61316705e4b0295f87dae396/playlist.m3u8?withCredentials=false&lowBitrate=true&doNotUseRedirect=true&country_code=US"
]

names = [
    "tdmax", "teletica", "canal6", "futv", "tgsprt",
    "tdmas", "canal11", "multimedios", "tdmas2", "canal1"
]

# Output directory
output_dir = "links/cr"
os.makedirs(output_dir, exist_ok=True)

# Loop through URLs and save each M3U8 file
for url, name in zip(urls, names):
    response = s.get(url, verify=False)
    print(f"Fetching for: {name}")

    if response.status_code == 200:
        try:
            data = response.json()
            m3u8_url = data.get("url")

            if m3u8_url:
                content = [
                    "#EXTM3U",
                    "#EXT-X-VERSION:3",
                    "#EXT-X-STREAM-INF:PROGRAM-ID=1",
                    m3u8_url
                ]
                output_path = os.path.join(output_dir, f"{name}.m3u8")
                with open(output_path, "w") as f:
                    f.write("\n".join(content))
                print(f"Saved: {output_path}")
            else:
                print(f"No 'url' found in response for {name}")
        except ValueError:
            print(f"Invalid JSON for {name}")
    else:
        print(f"Failed to fetch {name} — HTTP {response.status_code}")
