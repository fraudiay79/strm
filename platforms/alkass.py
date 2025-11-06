import requests
import re
import json
import os
import time
from urllib.parse import urlparse

def get_livestream_m3u8_url(session, url, channel_name):
    try:
        # Send GET request to the website
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = session.get(url, headers=headers)
        response.raise_for_status()
        
        # Method 1: Search for the hls URL pattern in the HTML
        html_content = response.text
        
        # Look for the hls URL in the sourceConfig object
        pattern = r'"hls":\s*"([^"]+)"'
        match = re.search(pattern, html_content)
        
        if match:
            m3u8_url = match.group(1)
            return m3u8_url
        
        # Method 2: Look for bitmovin player configuration
        pattern2 = r'var sourceConfig\s*=\s*({[^}]+})'
        match2 = re.search(pattern2, html_content)
        
        if match2:
            config_str = match2.group(1)
            try:
                config = json.loads(config_str)
                if 'hls' in config:
                    return config['hls']
            except json.JSONDecodeError:
                # If JSON parsing fails, try string extraction
                hls_pattern = r'"hls":\s*"([^"]+)"'
                hls_match = re.search(hls_pattern, config_str)
                if hls_match:
                    return hls_match.group(1)
        
        # Method 3: Look for any m3u8 URL in the HTML
        m3u8_pattern = r'https?://[^\s"\']+\.m3u8[^\s"\']*'
        m3u8_matches = re.findall(m3u8_pattern, html_content)
        
        if m3u8_matches:
            return m3u8_matches[0]
        
        return None
        
    except requests.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None
    except Exception as e:
        print(f"An error occurred for {url}: {e}")
        return None

def save_m3u8_url(channel_name, m3u8_url, output_dir):
    """Save the m3u8 URL to a file"""
    filename = f"{channel_name}.m3u8"
    filepath = os.path.join(output_dir, filename)
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(m3u8_url)
        print(f"✅ Saved: {filename}")
        return True
    except Exception as e:
        print(f"❌ Error saving {filename}: {e}")
        return False

def main():
    # Create session for persistent connections
    s = requests.Session()
    
    # Directory to save output files
    output_dir = "links/qa"
    os.makedirs(output_dir, exist_ok=True)
    
    # List of channels to process
    channels = [
        {"url": "https://shoof.alkass.net/live?ch=one", "name": "alkass1"},
        {"url": "https://shoof.alkass.net/live?ch=two", "name": "alkass2"},
        {"url": "https://shoof.alkass.net/live?ch=three", "name": "alkass3"},
        {"url": "https://shoof.alkass.net/live?ch=four", "name": "alkass4"},
        {"url": "https://shoof.alkass.net/live?ch=five", "name": "alkass5"},
        {"url": "https://shoof.alkass.net/live?ch=six", "name": "alkass6"}
    ]
    
    print("Fetching livestream m3u8 URLs for all channels...")
    print(f"Output directory: {output_dir}")
    print("-" * 50)
    
    results = []
    
    for channel in channels:
        print(f"\nProcessing {channel['name']}...")
        
        m3u8_url = get_livestream_m3u8_url(s, channel['url'], channel['name'])
        
        if m3u8_url:
            print(f"✅ Live stream m3u8 URL found for {channel['name']}:")
            print(f"   {m3u8_url}")
            
            # Save to file
            save_m3u8_url(channel['name'], m3u8_url, output_dir)
            
            # Optional: Verify the URL is accessible
            try:
                verify_response = s.head(m3u8_url, timeout=10)
                if verify_response.status_code == 200:
                    print("   ✅ URL is accessible")
                else:
                    print(f"   ⚠️ URL returned status code: {verify_response.status_code}")
            except:
                print("   ⚠️ Could not verify URL accessibility")
            
            results.append({
                'channel': channel['name'],
                'url': m3u8_url,
                'status': 'success'
            })
        else:
            print(f"❌ Could not find the m3u8 URL for {channel['name']}")
            results.append({
                'channel': channel['name'],
                'url': None,
                'status': 'failed'
            })
        
        # Small delay to be respectful to the server
        time.sleep(1)
    
    # Print summary
    print("\n" + "=" * 50)
    print("SUMMARY:")
    print("=" * 50)
    success_count = sum(1 for r in results if r['status'] == 'success')
    print(f"Successfully retrieved: {success_count}/{len(channels)} channels")
    
    for result in results:
        status_icon = "✅" if result['status'] == 'success' else "❌"
        print(f"{status_icon} {result['channel']}: {result['status']}")

if __name__ == "__main__":
    main()
