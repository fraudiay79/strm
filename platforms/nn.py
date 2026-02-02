import requests
import re
import json
import os

def extract_m3u8_url(source_url):
    """
    Extract m3u8 URL from the provided streaming link
    """
    try:
        # Headers to mimic a browser request
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://tkx.mp.lura.live/',
            'Origin': 'https://tkx.mp.lura.live'
        }
        
        print(f"Fetching data from: {source_url}")
        response = requests.get(source_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Clean the response text - remove the callback function wrapper
        response_text = response.text.strip()
        
        # The response is wrapped in anvatoVideoJSONLoaded() callback
        # Remove the callback function wrapper to get pure JSON
        if response_text.startswith('anvatoVideoJSONLoaded(') and response_text.endswith(')'):
            # Extract the JSON part between the parentheses
            json_start = response_text.find('(') + 1
            json_end = response_text.rfind(')')
            json_str = response_text[json_start:json_end]
            
            # Parse the JSON
            data = json.loads(json_str)
            
            print("Successfully parsed JSON response")
            print(f"Video Title: {data.get('def_title', 'N/A')}")
            print(f"Video Callsign: {data.get('derived_metadata', {}).get('videocallsign', 'N/A')}")
            
            # Extract m3u8 URL from published_urls
            if 'published_urls' in data and isinstance(data['published_urls'], list) and len(data['published_urls']) > 0:
                for url_info in data['published_urls']:
                    if (isinstance(url_info, dict) and 
                        'embed_url' in url_info and 
                        'format' in url_info and 
                        url_info.get('format') == 'm3u8-variant'):
                        
                        m3u8_url = url_info['embed_url']
                        print(f"Found m3u8 URL (format: {url_info.get('format_name', 'N/A')})")
                        
                        # The URL is already a complete HTTPS URL, no need to modify
                        return m3u8_url
                
                # If we didn't find m3u8-variant format, try any URL with .m3u8 in it
                for url_info in data['published_urls']:
                    if isinstance(url_info, dict) and 'embed_url' in url_info:
                        embed_url = url_info['embed_url']
                        if '.m3u8' in embed_url:
                            print(f"Found m3u8 URL (alternative format)")
                            return embed_url
            
            print("No m3u8 URL found in published_urls")
            return None
            
        else:
            print("Response doesn't match expected format (anvatoVideoJSONLoaded wrapper)")
            return None
        
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        print(f"Response preview: {response_text[:500]}...")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

def create_m3u8_file(m3u8_url, filename="playlist.m3u8"):
    """
    Create an m3u8 file with the extracted URL
    """
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write("#EXTM3U\n")
            f.write("#EXT-X-VERSION:3\n")
            f.write("#EXT-X-INDEPENDENT-SEGMENTS\n")
            f.write("# Playlist generated from News Nation stream\n")
            f.write(f"# Generated at: {get_current_time()}\n")
            f.write(f"# Original API: {SOURCE_URL}\n")
            f.write(f"{m3u8_url}\n")
        
        print(f"\nM3U8 file created: {filename}")
        print(f"Playlist URL: {m3u8_url}")
        return filename
        
    except Exception as e:
        print(f"Error creating m3u8 file: {e}")
        return None

def fetch_and_save_m3u8_content(m3u8_url, filename="stream_content.m3u8"):
    """
    Fetch the actual m3u8 content and save it
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://tkx.mp.lura.live/'
        }
        
        print(f"\nFetching m3u8 content from: {m3u8_url}")
        response = requests.get(m3u8_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(response.text)
        
        # Count lines for information
        line_count = len(response.text.split('\n'))
        print(f"M3U8 content saved to: {filename}")
        print(f"Playlist contains {line_count} lines")
        
        # Show first few lines for verification
        lines = response.text.split('\n')[:10]
        print("\nFirst 10 lines of playlist:")
        for i, line in enumerate(lines):
            print(f"{i+1:2}: {line}")
        
        return filename
        
    except Exception as e:
        print(f"Error fetching m3u8 content: {e}")
        return None

def get_current_time():
    """Get current date and time"""
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def test_m3u8_url(m3u8_url):
    """
    Test if the m3u8 URL is accessible and valid
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        print(f"\nTesting m3u8 URL...")
        response = requests.head(m3u8_url, headers=headers, timeout=5, allow_redirects=True)
        
        if response.status_code == 200:
            print(f"✓ M3U8 URL is accessible (Status: {response.status_code})")
            content_type = response.headers.get('content-type', '')
            if 'application/vnd.apple.mpegurl' in content_type or 'application/x-mpegurl' in content_type:
                print(f"✓ Correct content type: {content_type}")
            else:
                print(f"⚠ Unexpected content type: {content_type}")
            return True
        else:
            print(f"✗ M3U8 URL returned status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Error testing m3u8 URL: {e}")
        return False

def main():
    """Main function"""
    # Source URL
    global SOURCE_URL
    SOURCE_URL = "https://tkx.mp.lura.live/rest/v2/mcp/video/adstP5LOdMYydk9w?anvack=GNLYj4WPEPgKWUvG6mTVNFejokMyVq3x"
    
    print("=" * 60)
    print("M3U8 URL Extractor - News Nation Stream")
    print("=" * 60)
    
    # Extract m3u8 URL
    m3u8_url = extract_m3u8_url(SOURCE_URL)
    
    if not m3u8_url:
        print("\nFailed to extract m3u8 URL.")
        return
    
    print(f"\nExtracted m3u8 URL: {m3u8_url}")
    
    # Test the URL
    is_accessible = test_m3u8_url(m3u8_url)
    
    # Create m3u8 file with the URL
    playlist_file = create_m3u8_file(m3u8_url, "news_nation_stream.m3u8")
    
    # Fetch and save the actual m3u8 content
    if is_accessible:
        content_file = fetch_and_save_m3u8_content(m3u8_url, "news_nation_content.m3u8")
    
    # Create a simple VLC playlist file
    try:
        with open("news_nation_stream.vlc", 'w', encoding='utf-8') as f:
            f.write(f"{m3u8_url}\n")
        print(f"\nVLC playlist file created: news_nation_stream.vlc")
    except Exception as e:
        print(f"Note: Could not create VLC playlist file: {e}")
    
    print("\n" + "=" * 60)
    print("Summary:")
    print(f"1. Main playlist file: news_nation_stream.m3u8")
    if is_accessible:
        print(f"2. Full playlist content: news_nation_content.m3u8")
    print(f"3. VLC playlist: news_nation_stream.vlc")
    print("\nYou can open these files in media players like VLC, mpv, or FFmpeg")
    print("=" * 60)

if __name__ == "__main__":
    # Install requests if not available
    try:
        import requests
    except ImportError:
        print("Installing required packages...")
        import subprocess
        import sys
        subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
        import requests
    
    main()
