import requests
import re
import json
import os
import time
import sys
from pathlib import Path

def get_script_directory():
    """Get the directory where the script is located"""
    return Path(__file__).parent

def get_livestream_m3u8_url(session, url, channel_name):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://shoof.alkass.net/',
        }
        
        print(f"🔄 Fetching {channel_name}...")
        response = session.get(url, headers=headers, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ HTTP {response.status_code} for {channel_name}")
            return None
            
        html_content = response.text
        
        # Debug: Save HTML to check content
        debug_dir = get_script_directory().parent / "debug"
        os.makedirs(debug_dir, exist_ok=True)
        debug_file = debug_dir / f"{channel_name}.html"
        with open(debug_file, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"📄 Saved HTML to {debug_file}")
        
        # Method 1: Look for bitmovin player configuration with multi-line support
        print("🔍 Searching for bitmovin player configuration...")
        
        # Enhanced pattern to handle multi-line JavaScript
        pattern1 = r'var sourceConfig\s*=\s*({[^}]+(?:\s*[^}]+)*\s*})'
        match1 = re.search(pattern1, html_content, re.DOTALL)
        
        if match1:
            config_str = match1.group(1)
            print(f"✅ Found bitmovin config")
            
            # Clean the config string - remove extra spaces and normalize quotes
            config_str = re.sub(r'\s+', ' ', config_str)  # Replace multiple spaces with single space
            config_str = config_str.replace("'", '"')  # Normalize quotes
            
            try:
                config = json.loads(config_str)
                if 'hls' in config:
                    m3u8_url = config['hls'].strip()
                    print(f"🎯 Found HLS URL via bitmovin config JSON")
                    return m3u8_url
            except json.JSONDecodeError as e:
                print(f"⚠️ JSON parse error: {e}")
                print(f"⚠️ Config string: {config_str[:200]}...")
                
                # Fallback: direct string extraction from the config block
                hls_pattern = r'"hls":\s*"([^"]+)"'
                hls_match = re.search(hls_pattern, config_str)
                if hls_match:
                    m3u8_url = hls_match.group(1).strip()
                    print(f"🎯 Found HLS URL via string extraction")
                    return m3u8_url
        
        # Method 2: Direct multi-line search for hls pattern in the entire HTML
        print("🔍 Searching for HLS pattern in entire HTML...")
        hls_pattern_direct = r'"hls":\s*"([^"]+\.m3u8[^"]*)"'
        hls_matches = re.findall(hls_pattern_direct, html_content, re.DOTALL)
        
        for hls_url in hls_matches:
            clean_url = hls_url.strip()
            if clean_url and '.m3u8' in clean_url:
                print(f"🎯 Found HLS URL via direct pattern")
                return clean_url
        
        # Method 3: Look for any m3u8 URL with multi-line support
        print("🔍 Searching for any m3u8 URL...")
        m3u8_pattern = r'https?://[^\s"\']+\.m3u8[^\s"\']*'
        m3u8_matches = re.findall(m3u8_pattern, html_content, re.DOTALL)
        
        for match in m3u8_matches:
            clean_url = match.strip()
            if clean_url:
                print(f"🎯 Found m3u8 URL via generic pattern")
                return clean_url
        
        # Method 4: Extract from the specific script block we know exists
        print("🔍 Searching in specific script blocks...")
        
        # Pattern to find the entire script block containing sourceConfig
        script_block_pattern = r'var sourceConfig\s*=[^;]+;'
        script_blocks = re.findall(script_block_pattern, html_content, re.DOTALL)
        
        for block in script_blocks:
            if 'hls' in block and '.m3u8' in block:
                hls_url_match = re.search(r'"hls":\s*"([^"]+)"', block)
                if hls_url_match:
                    m3u8_url = hls_url_match.group(1).strip()
                    print(f"🎯 Found HLS URL in script block")
                    return m3u8_url
        
        print(f"❌ No m3u8 URL found in HTML for {channel_name}")
        return None
        
    except Exception as e:
        print(f"❌ Error fetching {url}: {e}")
        import traceback
        traceback.print_exc()
        return None

def save_m3u8_url(channel_name, m3u8_url, output_dir):
    """Save the m3u8 URL to a file"""
    filename = f"{channel_name}.m3u8"
    filepath = os.path.join(output_dir, filename)
    
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(m3u8_url)
        print(f"💾 Saved: {filename}")
        return True
    except Exception as e:
        print(f"❌ Error saving {filename}: {e}")
        return False

def main():
    print("🚀 Starting Alkass stream URL fetcher...")
    
    # Create session with persistent cookies
    s = requests.Session()
    
    # Set initial cookies (if any are needed)
    s.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
    })
    
    # Create output directory
    script_dir = get_script_directory()
    repo_root = script_dir.parent
    output_dir = repo_root / "links" / "qa"
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"📁 Output directory: {output_dir}")
    
    # Channels to process
    channels = [
        {"url": "https://shoof.alkass.net/live?ch=one", "name": "alkass1"},
        {"url": "https://shoof.alkass.net/live?ch=two", "name": "alkass2"},
        {"url": "https://shoof.alkass.net/live?ch=three", "name": "alkass3"},
        {"url": "https://shoof.alkass.net/live?ch=four", "name": "alkass4"},
        {"url": "https://shoof.alkass.net/live?ch=five", "name": "alkass5"},
        {"url": "https://shoof.alkass.net/live?ch=six", "name": "alkass6"}
    ]
    
    print(f"\n📡 Fetching livestream URLs for {len(channels)} channels...")
    print("-" * 60)
    
    results = []
    for channel in channels:
        print(f"\n🎬 Processing {channel['name']}...")
        print(f"🌐 URL: {channel['url']}")
        
        m3u8_url = get_livestream_m3u8_url(s, channel['url'], channel['name'])
        
        if m3u8_url:
            print(f"✅ Found URL: {m3u8_url}")
            save_success = save_m3u8_url(channel['name'], m3u8_url, output_dir)
            if save_success:
                results.append({'channel': channel['name'], 'status': 'success', 'url': m3u8_url})
            else:
                results.append({'channel': channel['name'], 'status': 'save_failed'})
        else:
            print(f"❌ No stream URL found")
            results.append({'channel': channel['name'], 'status': 'failed'})
        
        time.sleep(2)  # Be respectful to the server
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    success_count = sum(1 for r in results if r['status'] == 'success')
    
    for result in results:
        status_icon = "✅" if result['status'] == 'success' else "❌"
        print(f"{status_icon} {result['channel']}: {result['status']}")
        if result['status'] == 'success':
            print(f"   🔗 {result['url']}")
    
    print(f"\n🎯 Successfully retrieved: {success_count}/{len(channels)} channels")
    
    # List created files
    print(f"\n📄 Created files in {output_dir}:")
    for file in output_dir.glob("*.m3u8"):
        print(f"  - {file.name}")

if __name__ == "__main__":
    main()
