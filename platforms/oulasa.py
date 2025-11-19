import requests
import json
import os

def extract_hls_url_and_create_m3u8():
    # API endpoint URL
    api_url = "https://aloula.faulio.com/api/v1.1/channels/16/player"
    
    # Headers to mimic a browser
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'
    }
    
    # Create session
    s = requests.Session()
    
    # Directory to save output files
    output_dir = "links/sa"
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # Send GET request to the API with headers
        response = s.get(api_url, headers=headers)
        response.raise_for_status()  # Raise an exception for bad status codes
        
        # Parse JSON response
        data = response.json()
        
        # Extract HLS URL from the JSON structure
        hls_url = data.get("streams", {}).get("hls")
        
        if not hls_url:
            print("Error: HLS URL not found in the response")
            return None
        
        print(f"Extracted HLS URL: {hls_url}")
        
        # Create M3U8 file content
        m3u8_content = f"""#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=5598715,RESOLUTION=1920x1080,FRAME-RATE=25,CODECS="avc1.640028,mp4a.40.2",CLOSED-CAPTIONS=NONE
{hls_url}"""
        
        # Write to M3U8 file in the output directory
        m3u8_filename = os.path.join(output_dir, "ksasport4.m3u8")
        with open(m3u8_filename, "w", encoding="utf-8") as f:
            f.write(m3u8_content)
        
        print(f"M3U8 file created successfully: {m3u8_filename}")
        return m3u8_filename
        
    except requests.exceptions.RequestException as e:
        print(f"Error making API request: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON response: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None

# Alternative function with more detailed M3U8 format
def create_detailed_m3u8(hls_url, output_dir="links/sa"):
    """Create a more detailed M3U8 file with additional metadata"""
    
    m3u8_content = f"""#EXTM3U
#EXT-X-VERSION:3
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-TARGETDURATION:10
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:10.0,
{hls_url}
#EXT-X-ENDLIST"""
    
    try:
        os.makedirs(output_dir, exist_ok=True)
        filename = os.path.join(output_dir, "ksasport4_detailed.m3u8")
        with open(filename, "w", encoding="utf-8") as f:
            f.write(m3u8_content)
        print(f"Detailed M3U8 file created: {filename}")
        return filename
    except Exception as e:
        print(f"Error creating detailed M3U8 file: {e}")
        return None

# Simple version with all the updates
def simple_extract_and_create():
    api_url = "https://aloula.faulio.com/api/v1.1/channels/16/player"
    
    # Headers to mimic a browser
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'
    }
    
    # Create session
    s = requests.Session()
    
    # Directory to save output files
    output_dir = "links/sa"
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        response = s.get(api_url, headers=headers)
        data = response.json()
        hls_url = data["streams"]["hls"]
        
        # Create M3U8 file in the output directory
        m3u8_filename = os.path.join(output_dir, "ksasport4.m3u8")
        with open(m3u8_filename, "w") as f:
            f.write(f"#EXTM3U\n{hls_url}")
        
        print(f"HLS URL extracted and saved to {m3u8_filename}")
        print(f"HLS URL: {hls_url}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Extract HLS URL and create basic M3U8 file
    m3u8_file = extract_hls_url_and_create_m3u8()
    
    if m3u8_file:
        # Also create a more detailed version
        api_url = "https://aloula.faulio.com/api/v1.1/channels/16/player"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'
        }
        s = requests.Session()
        
        try:
            response = s.get(api_url, headers=headers)
            data = response.json()
            hls_url = data.get("streams", {}).get("hls")
            
            if hls_url:
                create_detailed_m3u8(hls_url)
        except:
            pass  # Ignore errors for the detailed version if basic one worked
    
    # You can also run the simple version directly:
    # simple_extract_and_create()
