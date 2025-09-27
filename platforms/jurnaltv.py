import requests
import re
import time

def get_jurnaltv_m3u8_with_retry():
    url = "https://www.jurnaltv.md/page/live"
    
    # Increased timeout and retry logic
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    for attempt in range(3):  # Retry up to 3 times
        try:
            print(f"Attempt {attempt + 1} to fetch {url}")
            response = requests.get(url, headers=headers, timeout=30)  # Increased timeout to 30 seconds
            response.raise_for_status()
            
            site_content = response.text
            print("Successfully fetched the page")
            
            # Method 1: Look for the master m3u8 URL directly
            m3u8_patterns = [
                r'file:\s*"([^"]+\.m3u8[^"]*)"',
                r'source:\s*"([^"]+\.m3u8[^"]*)"',
                r'var\s+streamUrl\s*=\s*"([^"]+\.m3u8[^"]*)"',
                r'player\.setup\([^)]*file["\']?:\s*["\']([^"\' ]+\.m3u8[^"\' ]*)'
            ]
            
            for pattern in m3u8_patterns:
                match = re.search(pattern, site_content)
                if match:
                    m3u8_url = match.group(1)
                    print(f"Found m3u8 URL with pattern: {pattern}")
                    print(f"URL: {m3u8_url}")
                    
                    # Fetch the master playlist
                    m3u8_response = requests.get(m3u8_url, headers=headers, timeout=30)
                    m3u8_response.raise_for_status()
                    
                    return m3u8_response.text
            
            # Method 2: Extract token and build URL manually
            token_pattern = r'token=([a-f0-9]{40})'
            tokens = re.findall(token_pattern, site_content)
            
            if tokens:
                current_token = list(set(tokens))[-1]  # Get unique tokens and take the last one
                print(f"Found token: {current_token}")
                
                # Build the master playlist manually based on the format you provided
                master_content = f"""#EXTM3U
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=1850000,BANDWIDTH=2310000,RESOLUTION=640x360,FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE
https://live.cdn.jurnaltv.md/JurnalTV_HD/tracks-v2a1/mono.ts.m3u8?token={current_token}
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=2860000,BANDWIDTH=3580000,RESOLUTION=1024x576,FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE
https://live.cdn.jurnaltv.md/JurnalTV_HD/tracks-v1a1/mono.ts.m3u8?token={current_token}"""
                
                return master_content
            
            # If we reach here, no patterns matched
            print("No m3u8 URL or token found in the page content")
            return None
            
        except requests.exceptions.Timeout:
            print(f"Attempt {attempt + 1} timed out. Retrying...")
            time.sleep(5)  # Wait 5 seconds before retry
        except requests.exceptions.RequestException as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            if attempt < 2:  # Don't sleep after the last attempt
                time.sleep(5)
        except Exception as e:
            print(f"Unexpected error on attempt {attempt + 1}: {e}")
            if attempt < 2:
                time.sleep(5)
    
    return None

# Alternative: Direct hardcoded approach since we know the format
def get_jurnaltv_fallback():
    """Fallback method using the known URL structure"""
    try:
        # Get the main page to extract a fresh token
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get("https://www.jurnaltv.md/page/live", headers=headers, timeout=30)
        if response.status_code == 200:
            # Extract the first 40-character hex token found
            token_match = re.search(r'[a-f0-9]{40}', response.text)
            if token_match:
                token = token_match.group(0)
                print(f"Using fallback token: {token}")
                
                # Build the master playlist
                master_content = f"""#EXTM3U
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=1850000,BANDWIDTH=2310000,RESOLUTION=640x360,FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE
https://live.cdn.jurnaltv.md/JurnalTV_HD/tracks-v2a1/mono.ts.m3u8?token={token}
#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=2860000,BANDWIDTH=3580000,RESOLUTION=1024x576,FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE
https://live.cdn.jurnaltv.md/JurnalTV_HD/tracks-v1a1/mono.ts.m3u8?token={token}"""
                
                return master_content
    
    except Exception as e:
        print(f"Fallback method also failed: {e}")
    
    return None

# Try the main approach first
print("=== Trying main approach ===")
result = get_jurnaltv_m3u8_with_retry()

if not result:
    print("\n=== Main approach failed, trying fallback ===")
    result = get_jurnaltv_fallback()

if result:
    print("\n=== Success! Generated m3u8 content ===")
    print(result)
else:
    print("\n=== All methods failed ===")
    print("The website might be temporarily unavailable or the structure has changed.")
