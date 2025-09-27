import requests
import os
import time
from datetime import datetime

headers = {
    "Referer": "https://www.tdmax.com/",
    "Origin": "https://www.tdmax.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
}

# Create session object
s = requests.Session()
s.headers.update(headers)

# Disable SSL warnings
try:
    requests.packages.urllib3.disable_warnings()
except:
    pass

# Base URLs (without the dynamic parameters that might change)
base_urls = [
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/6615734a8f081c7782f7652c/r/61316705e4b0295f87dae396/playlist.m3u8",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/65faeea68f08e1eb79bdd7b5/r/61316705e4b0295f87dae396/playlist.m3u8",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/66158e288f081c7782f7784c/r/61316705e4b0295f87dae396/playlist.m3u8",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/65faeee28f08e1eb79bdd7b7/r/61316705e4b0295f87dae396/playlist.m3u8",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/665a615c8f089605d9a00a91/r/61316705e4b0295f87dae396/playlist.m3u8",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/65faeefb8f08e1eb79bdd7ba/r/61316705e4b0295f87dae396/playlist.m3u8",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/66158e4b8f081c7782f77850/r/61316705e4b0295f87dae396/playlist.m3u8",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/668735858f0892aad1eb7762/r/61316705e4b0295f87dae396/playlist.m3u8",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/661572708f081c7782f762bd/r/61316705e4b0295f87dae396/playlist.m3u8",
    "https://cf.streann.tech/loadbalancer/services/public/channels-multiview/6687350b8f0892aad1eb7757/r/61316705e4b0295f87dae396/playlist.m3u8"
]

names = [
    "tdmax", "teletica", "canal6", "futv", "tgsprt",
    "tdmas", "canal11", "multimedios", "tdmas2", "canal1"
]

# Output directory
output_dir = "links/cr"
os.makedirs(output_dir, exist_ok=True)

def fetch_fresh_m3u8(base_url, name):
    """Fetch a fresh M3U8 URL with current parameters"""
    # Add current parameters to ensure fresh token
    params = {
        "withCredentials": "false",
        "lowBitrate": "true", 
        "doNotUseRedirect": "true",
        "country_code": "US",
        "_t": int(time.time())  # Add timestamp to avoid caching
    }
    
    url = f"{base_url}?{'&'.join(f'{k}={v}' for k, v in params.items())}"
    
    try:
        response = s.get(url, verify=False, timeout=10)
        print(f"Fetching for: {name} - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            m3u8_url = data.get("url")
            
            if m3u8_url:
                # Extract token expiration time for debugging
                if "wmsAuthSign" in m3u8_url:
                    import urllib.parse
                    from base64 import b64decode
                    
                    parsed = urllib.parse.urlparse(m3u8_url)
                    query_params = urllib.parse.parse_qs(parsed.query)
                    auth_sign = query_params.get('wmsAuthSign', [''])[0]
                    
                    try:
                        # Decode the base64 token to see expiration
                        decoded = b64decode(auth_sign).decode('utf-8')
                        print(f"  Token info: {decoded}")
                    except:
                        print("  Could not decode token")
                
                # Create M3U8 content
                content = [
                    "#EXTM3U",
                    "#EXT-X-VERSION:3",
                    "#EXT-X-STREAM-INF:PROGRAM-ID=1",
                    m3u8_url
                ]
                
                output_path = os.path.join(output_dir, f"{name}.m3u8")
                with open(output_path, "w", encoding='utf-8') as f:
                    f.write("\n".join(content))
                
                print(f"  Saved: {output_path}")
                print(f"  M3U8 URL: {m3u8_url[:100]}...")  # Show first 100 chars
                return True
            else:
                print(f"  No 'url' found in response for {name}")
                return False
        else:
            print(f"  Failed to fetch {name} — HTTP {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"  Error fetching {name}: {e}")
        return False
    except ValueError as e:
        print(f"  Invalid JSON for {name}: {e}")
        return False

# Main execution
print(f"Starting M3U8 fetch at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("-" * 50)

success_count = 0
for base_url, name in zip(base_urls, names):
    if fetch_fresh_m3u8(base_url, name):
        success_count += 1
    print()  # Empty line for readability

print("-" * 50)
print(f"Completed: {success_count}/{len(names)} channels updated successfully")
print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
