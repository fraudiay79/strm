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

def fetch_with_advanced_headers(url, channel_name):
    """Fetch with advanced headers to bypass protections"""
    try:
        # Comprehensive headers to mimic a real browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        }
        
        print(f"🔄 Fetching {channel_name} with advanced headers...")
        session = requests.Session()
        
        # Add retry logic
        for attempt in range(3):
            try:
                response = session.get(url, headers=headers, timeout=30, allow_redirects=True)
                print(f"📊 Response status: {response.status_code}")
                print(f"📊 Response length: {len(response.text)} characters")
                print(f"📊 Final URL: {response.url}")
                print(f"📊 Cookies: {dict(session.cookies)}")
                
                if response.status_code == 200 and len(response.text) > 1000:
                    return response.text
                elif response.status_code == 403:
                    print("❌ 403 Forbidden - Access denied")
                    break
                elif response.status_code == 429:
                    print("❌ 429 Too Many Requests - Rate limited")
                    time.sleep(5)
                else:
                    print(f"⚠️ Attempt {attempt + 1} failed with status {response.status_code}")
                    time.sleep(2)
                    
            except requests.exceptions.RequestException as e:
                print(f"⚠️ Attempt {attempt + 1} failed with error: {e}")
                time.sleep(2)
        
        return None
        
    except Exception as e:
        print(f"❌ Error fetching {url}: {e}")
        return None

def try_alternative_approaches(url, channel_name):
    """Try alternative approaches to get the stream URLs"""
    print(f"\n🔄 Trying alternative approaches for {channel_name}...")
    
    # Approach 1: Check if there's a mobile API or alternative endpoint
    mobile_urls = [
        f"https://shoof.alkass.net/api/stream/{channel_name}",
        f"https://shoof.alkass.net/api/live/{channel_name}",
        f"https://shoof.alkass.net/mobile/live?ch={channel_name.replace('alkass', '')}",
        f"https://shoof.alkass.net/embed/live?ch={channel_name.replace('alkass', '')}",
    ]
    
    session = requests.Session()
    headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest',
    }
    
    for alt_url in mobile_urls:
        try:
            print(f"🔍 Trying alternative URL: {alt_url}")
            response = session.get(alt_url, headers=headers, timeout=10)
            if response.status_code == 200:
                print(f"✅ Alternative URL worked: {alt_url}")
                print(f"📊 Response: {response.text[:200]}...")
                return response.text
        except:
            continue
    
    # Approach 2: Try to find the stream URL from known Alkass CDN patterns
    print(f"\n🔍 Trying known Alkass CDN patterns...")
    
    # Common Alkass stream patterns (based on the URL you provided earlier)
    base_patterns = [
        f"https://liveeu-gcps.alkassdigital.net/{channel_name}-p/main.m3u8",
        f"https://liveeu-gcps.alkassdigital.net/{channel_name.replace('alkass', 'alkass')}-p/main.m3u8",
        f"https://live.alkassdigital.net/{channel_name}/main.m3u8",
        f"https://cdn.alkassdigital.net/{channel_name}/playlist.m3u8",
    ]
    
    session = requests.Session()
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://shoof.alkass.net',
        'Referer': 'https://shoof.alkass.net/',
    }
    
    for pattern_url in base_patterns:
        try:
            print(f"🔍 Testing CDN URL: {pattern_url}")
            response = session.head(pattern_url, headers=headers, timeout=10)
            if response.status_code == 200:
                print(f"✅ CDN URL is accessible: {pattern_url}")
                return pattern_url
        except:
            continue
    
    return None

def check_public_sources(channel_name):
    """Check if there are public sources or known working URLs"""
    print(f"\n🔍 Checking public sources for {channel_name}...")
    
    # Known Alkass stream patterns (you might need to update these)
    known_patterns = {
        "alkass1": "https://liveeu-gcps.alkassdigital.net/alkass1-p/main.m3u8",
        "alkass2": "https://liveeu-gcps.alkassdigital.net/alkass2-p/main.m3u8", 
        "alkass3": "https://liveeu-gcps.alkassdigital.net/alkass3-p/main.m3u8",
        "alkass4": "https://liveeu-gcps.alkassdigital.net/alkass4-p/main.m3u8",
        "alkass5": "https://liveeu-gcps.alkassdigital.net/alkass5-p/main.m3u8",
        "alkass6": "https://liveeu-gcps.alkassdigital.net/alkass6-p/main.m3u8",
    }
    
    if channel_name in known_patterns:
        test_url = known_patterns[channel_name]
        print(f"🔍 Testing known pattern: {test_url}")
        
        try:
            session = requests.Session()
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
            }
            
            response = session.head(test_url, headers=headers, timeout=10)
            if response.status_code == 200:
                print(f"✅ Known pattern works: {test_url}")
                return test_url
            else:
                print(f"⚠️ Known pattern returned status: {response.status_code}")
        except Exception as e:
            print(f"❌ Known pattern failed: {e}")
    
    return None

def main():
    print("🚀 Starting advanced stream URL discovery...")
    
    # Create output directory
    script_dir = get_script_directory()
    repo_root = script_dir.parent
    output_dir = repo_root / "links" / "qa"
    os.makedirs(output_dir, exist_ok=True)
    
    # Test with one channel first
    channels = [
        {"url": "https://shoof.alkass.net/live?ch=one", "name": "alkass1"},
    ]
    
    for channel in channels:
        print(f"\n" + "="*80)
        print(f"🎬 ADVANCED DISCOVERY: {channel['name']}")
        print("="*80)
        
        # Method 1: Try with advanced headers
        html_content = fetch_with_advanced_headers(channel['url'], channel['name'])
        
        if html_content and len(html_content) > 1000:
            print(f"✅ Successfully fetched substantial HTML ({len(html_content)} chars)")
            # Save for analysis
            debug_dir = script_dir.parent / "debug"
            os.makedirs(debug_dir, exist_ok=True)
            with open(debug_dir / f"{channel['name']}_success.html", "w", encoding="utf-8") as f:
                f.write(html_content)
        else:
            print(f"❌ Could not fetch proper HTML content")
            
            # Method 2: Try alternative approaches
            alt_result = try_alternative_approaches(channel['url'], channel['name'])
            
            if not alt_result:
                # Method 3: Check public sources
                public_url = check_public_sources(channel['name'])
                if public_url:
                    print(f"🎉 Found working URL from public sources: {public_url}")
                    
                    # Save the URL
                    filename = f"{channel['name']}.m3u8"
                    filepath = output_dir / filename
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(public_url)
                    print(f"💾 Saved: {filename}")
                else:
                    print(f"❌ All methods failed for {channel['name']}")

if __name__ == "__main__":
    main()
