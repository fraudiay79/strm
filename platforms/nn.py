import requests
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
        if response_text.startswith('anvatoVideoJSONLoaded(') and response_text.endswith(')'):
            # Extract the JSON part between the parentheses
            json_start = response_text.find('(') + 1
            json_end = response_text.rfind(')')
            json_str = response_text[json_start:json_end]
            
            # Parse the JSON
            data = json.loads(json_str)
            
            print("Successfully parsed JSON response")
            print(f"Video Title: {data.get('def_title', 'N/A')}")
            
            # Extract m3u8 URL from published_urls
            if 'published_urls' in data and isinstance(data['published_urls'], list) and len(data['published_urls']) > 0:
                for url_info in data['published_urls']:
                    if (isinstance(url_info, dict) and 
                        'embed_url' in url_info and 
                        'format' in url_info and 
                        url_info.get('format') == 'm3u8-variant'):
                        
                        m3u8_url = url_info['embed_url']
                        print(f"Found m3u8 URL (format: {url_info.get('format_name', 'N/A')})")
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
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

def save_m3u8_content(m3u8_url, output_file):
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
        
        # Save the m3u8 content
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(response.text)
        
        # Show some information about the playlist
        line_count = len(response.text.split('\n'))
        print(f"✓ M3U8 playlist saved to: {output_file}")
        print(f"✓ Playlist contains {line_count} lines")
        
        # Show first few lines for verification
        print("\nFirst 5 lines of playlist:")
        lines = response.text.split('\n')[:5]
        for i, line in enumerate(lines):
            print(f"  {i+1}: {line}")
        
        return output_file
        
    except requests.exceptions.RequestException as e:
        print(f"✗ Error fetching m3u8 content: {e}")
        return None
    except Exception as e:
        print(f"✗ Error saving m3u8 file: {e}")
        return None

def main():
    """Main function"""
    SOURCE_URL = "https://tkx.mp.lura.live/rest/v2/mcp/video/adstP5LOdMYydk9w?anvack=GNLYj4WPEPgKWUvG6mTVNFejokMyVq3x"
    
    # Directory to save output files
    output_dir = "links/us"
    os.makedirs(output_dir, exist_ok=True)
    
    output_file = f'{output_dir}/newsnation.m3u8'
    
    print("Extracting m3u8 URL...")
    
    # Extract m3u8 URL
    m3u8_url = extract_m3u8_url(SOURCE_URL)
    
    if not m3u8_url:
        print("\nFailed to extract m3u8 URL.")
        return
    
    print(f"\n✓ Extracted m3u8 URL: {m3u8_url}")
    
    # Save the m3u8 content
    saved_file = save_m3u8_content(m3u8_url, output_file)
    
    if saved_file:
        print(f"\n✓ Successfully saved m3u8 playlist to: {saved_file}")
        print(f"\nYou can now use this file with media players like:")
        print(f"  - VLC: vlc {saved_file}")
        print(f"  - mpv: mpv {saved_file}")
        print(f"  - FFmpeg: ffmpeg -i {saved_file} -c copy output.mp4")
    else:
        print("\n✗ Failed to save m3u8 playlist")

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
