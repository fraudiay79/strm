import requests

url = 'https://cf.streann.tech/loadbalancer/services/public/channels-multiview/6615734a8f081c7782f7652c/r/61316705e4b0295f87dae396/playlist.m3u8?withCredentials=false&lowBitrate=true&doNotUseRedirect=true&country_code=US'

headers = {
    "Referer": "https://www.tdmax.com/",
    "Origin": "https://www.tdmax.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
}

# Disable SSL verification warnings
requests.packages.urllib3.disable_warnings()

response = requests.get(url, headers=headers, verify=False)

if response.status_code == 200:
    try:
        json_data = response.json()
        m3u8_url = json_data.get("url")

        if m3u8_url:
            print("#EXTM3U")
            print("#EXT-X-VERSION:3")
            print('#EXT-X-STREAM-INF:BANDWIDTH=2616379,FRAME-RATE=30,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"')
            print(m3u8_url)
        else:
            print("No 'url' found in the response.")
    except ValueError:
        print("Response is not valid JSON.")
else:
    print(f"Failed to fetch content. HTTP Status code: {response.status_code}")
