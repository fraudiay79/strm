import requests
import re

def get_jurnaltv_m3u8():
    url = "https://www.jurnaltv.md/page/live"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        # Try to find the current token in the page
        site_content = response.text
        
        # Look for tokens in the page content
        token_pattern = r'token=([a-f0-9]{40})'
        tokens = re.findall(token_pattern, site_content)
        
        if tokens:
            # Use the most recent token (usually the last one found)
            current_token = tokens[-1]
            print(f"Found current token: {current_token}")
            
            # Construct the master playlist URL with current token
            base_url = "https://live.cdn.jurnaltv.md/JurnalTV_HD/"
            master_content = f"""#EXTM3U
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=1850000,BANDWIDTH=2310000,RESOLUTION=640x360,FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE
{base_url}tracks-v2a1/mono.ts.m3u8?token={current_token}
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=2860000,BANDWIDTH=3580000,RESOLUTION=1024x576,FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE
{base_url}tracks-v1a1/mono.ts.m3u8?token={current_token}"""
            
            return master_content
        
        # Fallback: try to extract the m3u8 URL directly
        m3u8_match = re.search(r'file:\s*"(https://[^"]+\.m3u8[^"]*)"', site_content)
        if m3u8_match:
            m3u8_url = m3u8_match.group(1)
            print(f"Found m3u8 URL: {m3u8_url}")
            
            # Fetch the current playlist
            m3u8_response = requests.get(m3u8_url, timeout=10)
            m3u8_response.raise_for_status()
            
            return m3u8_response.text
        
        return None
        
    except requests.RequestException as e:
        print(f"Error fetching content: {e}")
        return None

# Run the function
result = get_jurnaltv_m3u8()
if result:
    print(result)
else:
    print("Failed to get current m3u8 playlist")
