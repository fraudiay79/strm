import requests
import json

# Headers
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
REFERER = "https://www.atv.com.tr/"
ACCEPT = "application/json, text/plain, */*"

url = 'https://securevideotoken.tmgrup.com.tr/webtv/secure?260329&url=https%3A%2F%2Ftrkvz-live.ercdn.net%2Fatvhd%2Fatvhd.m3u8&url2=https%3A%2F%2Ftrkvz-live.ercdn.net%2Fatvhd%2Fatvhd.m3u8'

headers = {
    'User-Agent': USER_AGENT,
    'Referer': REFERER,
    'Accept': ACCEPT
}

response = requests.get(url, headers=headers, verify=False)

if response.status_code == 200:
    try:
        # Parse JSON response
        data = response.json()
        
        if data.get("Success"):
            # Extract the URL and remove the .m3u8 part to get the base URL
            secure_url = data["Url"]
            
            # Extract the base URL without the quality suffix and file extension
            base_url = secure_url.replace('_1080p.m3u8', '').replace('.m3u8', '')
            
            # Extract the query parameters (st and e values)
            if '?' in secure_url:
                query_params = secure_url.split('?')[1]
            else:
                query_params = ""
            
            # Print output in the specified format
            print("#EXTM3U")
            print("#EXT-X-VERSION:3")
            
            # 1080p
            print("#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2000000,NAME=1080p,RESOLUTION=1920x1080")
            if query_params:
                print(f"{base_url}_1080p.m3u8?{query_params}")
            else:
                print(f"{base_url}_1080p.m3u8")
            
            # 720p
            print("#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=1200000,NAME=720p,RESOLUTION=1536x864")
            if query_params:
                print(f"{base_url}_720p.m3u8?{query_params}")
            else:
                print(f"{base_url}_720p.m3u8")
            
            # 360p
            print("#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=400000,NAME=360p,RESOLUTION=768x432")
            if query_params:
                print(f"{base_url}_360p.m3u8?{query_params}")
            else:
                print(f"{base_url}_360p.m3u8")
            
            # 240p
            print("#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=200000,NAME=240p,RESOLUTION=512x288")
            if query_params:
                print(f"{base_url}_240p.m3u8?{query_params}")
            else:
                print(f"{base_url}_240p.m3u8")
                
        else:
            print("API returned Success: false")
            
    except json.JSONDecodeError:
        print("Failed to parse JSON response")
else:
    print(f"Failed to fetch content. HTTP Status code: {response.status_code}")
