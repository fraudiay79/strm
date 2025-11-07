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

def fetch_and_analyze_html(url, channel_name):
    """Fetch HTML and analyze its structure in detail"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://shoof.alkass.net/',
        }
        
        print(f"🔄 Fetching {channel_name}...")
        session = requests.Session()
        response = session.get(url, headers=headers, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ HTTP {response.status_code} for {channel_name}")
            return None
            
        html_content = response.text
        print(f"✅ Successfully fetched {len(html_content)} characters")
        
        # Create debug directory
        debug_dir = get_script_directory().parent / "debug"
        os.makedirs(debug_dir, exist_ok=True)
        debug_file = debug_dir / f"{channel_name}_detailed.html"
        with open(debug_file, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"📄 Saved HTML to {debug_file}")
        
        # Analyze the HTML content
        analyze_html_structure(html_content, channel_name)
        
        return html_content
        
    except Exception as e:
        print(f"❌ Error fetching {url}: {e}")
        return None

def analyze_html_structure(html_content, channel_name):
    """Analyze the HTML structure in detail"""
    print(f"\n🔍 Analyzing HTML structure for {channel_name}...")
    
    # Check for key elements
    key_elements = {
        'sourceConfig': 'sourceConfig',
        'bitmovin': 'bitmovin',
        'player': 'player',
        'm3u8': 'm3u8',
        'hls': 'hls',
        'alkassdigital': 'alkassdigital',
        'video-container': 'video-container',
        'live': 'live',
    }
    
    for key, description in key_elements.items():
        if key in html_content:
            print(f"✅ '{description}' found in HTML")
            
            # Show context for important elements
            if key in ['sourceConfig', 'm3u8', 'hls']:
                positions = [m.start() for m in re.finditer(re.escape(key), html_content)]
                for i, pos in enumerate(positions[:2]):  # Show first 2 occurrences
                    start = max(0, pos - 100)
                    end = min(len(html_content), pos + 300)
                    context = html_content[start:end]
                    print(f"   📍 Occurrence {i+1} context:")
                    print(f"      ...{context}...")
    
    # Look for script tags containing player configuration
    print(f"\n🔍 Searching for script tags...")
    script_pattern = r'<script[^>]*>(.*?)</script>'
    scripts = re.findall(script_pattern, html_content, re.DOTALL | re.IGNORECASE)
    print(f"📜 Found {len(scripts)} script tags")
    
    for i, script in enumerate(scripts):
        script_lower = script.lower()
        if any(keyword in script_lower for keyword in ['bitmovin', 'player', 'sourceconfig', 'hls', 'm3u8']):
            print(f"\n🎮 Relevant Script {i+1}:")
            # Clean and show relevant parts of the script
            lines = script.split('\n')
            relevant_lines = []
            for line in lines:
                line_stripped = line.strip()
                if any(keyword in line_stripped.lower() for keyword in ['bitmovin', 'player', 'sourceconfig', 'hls', 'm3u8', 'alkassdigital']):
                    relevant_lines.append(line_stripped)
            
            if relevant_lines:
                for line in relevant_lines[:10]:  # Show first 10 relevant lines
                    print(f"   📄 {line}")
            else:
                print(f"   (Script contains keywords but no relevant lines found)")
    
    # Look for specific patterns
    print(f"\n🔍 Searching for specific URL patterns...")
    
    patterns = [
        (r'https://liveeu-gcps\.alkassdigital\.net/[^\s"\']+\.m3u8[^\s"\']*', 'alkassdigital m3u8'),
        (r'"hls":\s*"([^"]+)"', 'hls property'),
        (r'var sourceConfig\s*=\s*({[^}]+})', 'sourceConfig object'),
        (r'player\.load\(([^)]+)\)', 'player.load call'),
        (r'\.m3u8\?[^\s"\']*', 'm3u8 with params'),
    ]
    
    for pattern, description in patterns:
        matches = re.findall(pattern, html_content, re.DOTALL | re.IGNORECASE)
        if matches:
            print(f"✅ Found {len(matches)} {description} pattern(s):")
            for j, match in enumerate(matches[:3]):  # Show first 3 matches
                if isinstance(match, tuple):
                    match = match[0]  # Get the first group if it's a tuple
                print(f"   {j+1}. {match[:150]}...")
    
    # Check for iframes
    print(f"\n🔍 Searching for iframes...")
    iframe_pattern = r'<iframe[^>]*src="([^"]*)"[^>]*>'
    iframes = re.findall(iframe_pattern, html_content, re.IGNORECASE)
    if iframes:
        print(f"🖼️ Found {len(iframes)} iframes:")
        for iframe in iframes:
            print(f"   - {iframe}")
    
    # Check for JSON data
    print(f"\n🔍 Searching for JSON data...")
    json_pattern = r'\{[^{}]*"[^"]*"[^{}]*\}'
    json_matches = re.findall(json_pattern, html_content)
    relevant_json = []
    for json_str in json_matches:
        if any(keyword in json_str.lower() for keyword in ['hls', 'm3u8', 'stream', 'live']):
            relevant_json.append(json_str)
    
    if relevant_json:
        print(f"📊 Found {len(relevant_json)} relevant JSON objects:")
        for j, json_obj in enumerate(relevant_json[:3]):
            print(f"   {j+1}. {json_obj[:200]}...")

def main():
    print("🔍 Starting comprehensive HTML analysis...")
    print(f"📁 Current directory: {os.getcwd()}")
    print(f"📁 Script directory: {get_script_directory()}")
    
    # Test with one channel
    channels = [
        {"url": "https://shoof.alkass.net/live?ch=one", "name": "alkass1"},
    ]
    
    for channel in channels:
        print(f"\n" + "="*80)
        print(f"🎬 COMPREHENSIVE ANALYSIS: {channel['name']}")
        print(f"🌐 URL: {channel['url']}")
        print("="*80)
        
        html_content = fetch_and_analyze_html(channel['url'], channel['name'])
        
        if html_content:
            print(f"\n✅ Analysis complete for {channel['name']}")
        else:
            print(f"\n❌ Failed to analyze {channel['name']}")

if __name__ == "__main__":
    main()
