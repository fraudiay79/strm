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

def extract_m3u8_from_html(html_content, channel_name):
    """Extract m3u8 URL using multiple targeted methods"""
    
    # Method 1: Direct extraction from the specific pattern we see in the HTML
    print("🔍 Method 1: Direct pattern extraction...")
    
    # The URL pattern we're looking for: https://liveeu-gcps.alkassdigital.net/alkass1-p/main.m3u8?hdnts=...
    direct_pattern = r'https://liveeu-gcps\.alkassdigital\.net/[^\s"\']+\.m3u8[^\s"\']*'
    direct_match = re.search(direct_pattern, html_content)
    if direct_match:
        m3u8_url = direct_match.group(0).strip()
        print(f"✅ Found via direct pattern: {m3u8_url[:80]}...")
        return m3u8_url
    
    # Method 2: Look for the exact hls line in the sourceConfig
    print("🔍 Method 2: HLS line extraction...")
    hls_line_pattern = r'"hls":\s*"([^"]+)"'
    hls_matches = re.findall(hls_line_pattern, html_content)
    for match in hls_matches:
        if '.m3u8' in match:
            m3u8_url = match.strip()
            print(f"✅ Found via hls line: {m3u8_url[:80]}...")
            return m3u8_url
    
    # Method 3: Find the script block containing sourceConfig and extract manually
    print("🔍 Method 3: Script block extraction...")
    script_pattern = r'var sourceConfig\s*=\s*{([^}]+)}'
    script_match = re.search(script_pattern, html_content, re.DOTALL)
    if script_match:
        config_content = script_match.group(1)
        # Now look for hls in this specific block
        hls_in_config = re.search(r'"hls":\s*"([^"]+)"', config_content)
        if hls_in_config:
            m3u8_url = hls_in_config.group(1).strip()
            print(f"✅ Found in sourceConfig block: {m3u8_url[:80]}...")
            return m3u8_url
    
    # Method 4: Extract from the entire sourceConfig object including nested content
    print("🔍 Method 4: Extended sourceConfig extraction...")
    extended_pattern = r'var sourceConfig\s*=\s*{.*?"hls":\s*"([^"]+)".*?}'
    extended_match = re.search(extended_pattern, html_content, re.DOTALL)
    if extended_match:
        m3u8_url = extended_match.group(1).strip()
        print(f"✅ Found via extended pattern: {m3u8_url[:80]}...")
        return m3u8_url
    
    # Method 5: Simple string search and context extraction
    print("🔍 Method 5: String search...")
    if '.m3u8' in html_content:
        # Find the position of .m3u8 and extract the URL around it
        m3u8_pos = html_content.find('.m3u8')
        if m3u8_pos != -1:
            # Extract 300 characters before and 100 characters after
            start = max(0, m3u8_pos - 300)
            end = min(len(html_content), m3u8_pos + 100)
            context = html_content[start:end]
            
            # Now look for the full URL in this context
            url_pattern = r'(https?://[^\s"\']+\.m3u8[^\s"\']*)'
            url_match = re.search(url_pattern, context)
            if url_match:
                m3u8_url = url_match.group(1).strip()
                print(f"✅ Found via context search: {m3u8_url[:80]}...")
                return m3u8_url
    
    # Method 6: Look for alkassdigital.net domains with m3u8
    print("🔍 Method 6: Domain-specific search...")
    domain_pattern = r'https://liveeu-gcps\.alkassdigital\.net/[^\s"\']*\.m3u8\?[^\s"\']*'
    domain_match = re.search(domain_pattern, html_content)
    if domain_match:
        m3u8_url = domain_match.group(0).strip()
        print(f"✅ Found via domain pattern: {m3u8_url[:80]}...")
        return m3u8_url
    
    return None

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
        
        # Save HTML for debugging
        debug_dir = get_script_directory().parent / "debug"
        os.makedirs(debug_dir, exist_ok=True)
        debug_file = debug_dir / f"{channel_name}.html"
        with open(debug_file, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"📄 Saved HTML to {debug_file}")
        
        # Try to extract m3u8 URL
        m3u8_url = extract_m3u8_from_html(html_content, channel_name)
        
        if m3u8_url:
            return m3u8_url
        else:
            print(f"❌ No m3u8 URL found in HTML for {channel_name}")
            
            # Debug: Show a snippet of the HTML where we expect to find the URL
            if 'sourceConfig' in html_content:
                source_config_pos = html_content.find('sourceConfig')
                snippet_start = max(0, source_config_pos - 200)
                snippet_end = min(len(html_content), source_config_pos + 1000)
                snippet = html_content[snippet_start:snippet_end]
                print(f"🔍 Debug snippet around sourceConfig:\n{snippet[:500]}...")
            
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
    
    # Set headers
    s.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
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
        
        time.sleep(1)
    
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
