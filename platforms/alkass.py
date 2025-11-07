import requests
import re
import json
import os
import time
import sys
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def get_script_directory():
    """Get the directory where the script is located"""
    return Path(__file__).parent

def setup_selenium_driver():
    """Setup Selenium Chrome driver"""
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    driver = webdriver.Chrome(options=chrome_options)
    return driver

def extract_m3u8_with_selenium(url, channel_name):
    """Use Selenium to get fully rendered HTML and extract m3u8"""
    driver = None
    try:
        print(f"🔄 Starting Selenium for {channel_name}...")
        driver = setup_selenium_driver()
        
        print(f"🌐 Loading page: {url}")
        driver.get(url)
        
        # Wait for the page to load and JavaScript to execute
        wait = WebDriverWait(driver, 20)
        
        # Wait for either the video container or script elements to load
        try:
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "script")))
            print("✅ Page loaded successfully")
        except:
            print("⚠️ Page loaded but may not have all elements")
        
        # Get the fully rendered HTML
        html_content = driver.page_source
        
        # Save the rendered HTML for debugging
        debug_dir = get_script_directory().parent / "debug"
        os.makedirs(debug_dir, exist_ok=True)
        debug_file = debug_dir / f"{channel_name}_selenium.html"
        with open(debug_file, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"📄 Saved rendered HTML to {debug_file}")
        
        # Try multiple extraction methods on the rendered HTML
        m3u8_url = extract_from_rendered_html(html_content, channel_name)
        
        if m3u8_url:
            return m3u8_url
        
        # If not found in HTML, try to extract from network requests or console logs
        print("🔍 Checking for m3u8 in network requests...")
        
        # Get all script tags content
        scripts = driver.find_elements(By.TAG_NAME, "script")
        for i, script in enumerate(scripts):
            script_content = script.get_attribute("innerHTML")
            if script_content and 'm3u8' in script_content:
                print(f"🔍 Found m3u8 in script {i+1}")
                url_match = re.search(r'https://liveeu-gcps\.alkassdigital\.net/[^\s"\']+\.m3u8[^\s"\']*', script_content)
                if url_match:
                    m3u8_url = url_match.group(0)
                    print(f"✅ Extracted from script: {m3u8_url}")
                    return m3u8_url
        
        return None
        
    except Exception as e:
        print(f"❌ Selenium error for {channel_name}: {e}")
        return None
    finally:
        if driver:
            driver.quit()

def extract_from_rendered_html(html_content, channel_name):
    """Extract m3u8 from fully rendered HTML"""
    
    # Method 1: Look for the specific alkassdigital pattern
    print("🔍 Searching for alkassdigital pattern...")
    pattern1 = r'https://liveeu-gcps\.alkassdigital\.net/[^\s"\']+\.m3u8[^\s"\']*'
    match1 = re.search(pattern1, html_content)
    if match1:
        m3u8_url = match1.group(0).strip()
        print(f"✅ Found via alkassdigital pattern: {m3u8_url}")
        return m3u8_url
    
    # Method 2: Look for hls in sourceConfig
    print("🔍 Searching for sourceConfig...")
    if 'sourceConfig' in html_content:
        # Find the sourceConfig object
        source_config_pattern = r'sourceConfig\s*=\s*{([^}]+)}'
        match2 = re.search(source_config_pattern, html_content, re.DOTALL)
        if match2:
            config_content = match2.group(1)
            hls_match = re.search(r'"hls":\s*"([^"]+)"', config_content)
            if hls_match:
                m3u8_url = hls_match.group(1).strip()
                print(f"✅ Found in sourceConfig: {m3u8_url}")
                return m3u8_url
    
    # Method 3: Look for any m3u8 URL
    print("🔍 Searching for any m3u8 URL...")
    m3u8_pattern = r'https?://[^\s"\']+\.m3u8[^\s"\']*'
    matches = re.findall(m3u8_pattern, html_content)
    for match in matches:
        if 'alkassdigital' in match:
            print(f"✅ Found m3u8 URL: {match}")
            return match
    
    # Method 4: Look for player.load() calls
    print("🔍 Searching for player.load calls...")
    player_load_pattern = r'player\.load\(([^)]+)\)'
    player_match = re.search(player_load_pattern, html_content, re.DOTALL)
    if player_match:
        load_content = player_match.group(1)
        hls_match = re.search(r'"hls":\s*"([^"]+)"', load_content)
        if hls_match:
            m3u8_url = hls_match.group(1).strip()
            print(f"✅ Found in player.load: {m3u8_url}")
            return m3u8_url
    
    return None

def get_livestream_m3u8_url_requests(session, url, channel_name):
    """Fallback method using requests"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://shoof.alkass.net/',
        }
        
        print(f"🔄 Fetching {channel_name} with requests...")
        response = session.get(url, headers=headers, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ HTTP {response.status_code} for {channel_name}")
            return None
            
        html_content = response.text
        
        # Save HTML for debugging
        debug_dir = get_script_directory().parent / "debug"
        os.makedirs(debug_dir, exist_ok=True)
        debug_file = debug_dir / f"{channel_name}_requests.html"
        with open(debug_file, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"📄 Saved HTML to {debug_file}")
        
        return extract_from_rendered_html(html_content, channel_name)
        
    except Exception as e:
        print(f"❌ Requests error for {channel_name}: {e}")
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
    print("🚀 Starting Alkass stream URL fetcher with Selenium...")
    
    # Create output directory
    script_dir = get_script_directory()
    repo_root = script_dir.parent
    output_dir = repo_root / "links" / "qa"
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"📁 Output directory: {output_dir}")
    print(f"📁 Current working directory: {os.getcwd()}")
    print(f"📁 Script directory: {script_dir}")
    
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
    
    # First try with Selenium
    for channel in channels:
        print(f"\n🎬 Processing {channel['name']} with Selenium...")
        print(f"🌐 URL: {channel['url']}")
        
        m3u8_url = extract_m3u8_with_selenium(channel['url'], channel['name'])
        
        if not m3u8_url:
            print(f"🔄 Selenium failed, trying requests...")
            session = requests.Session()
            m3u8_url = get_livestream_m3u8_url_requests(session, channel['url'], channel['name'])
        
        if m3u8_url:
            print(f"✅ Found URL: {m3u8_url}")
            save_success = save_m3u8_url(channel['name'], m3u8_url, output_dir)
            if save_success:
                results.append({'channel': channel['name'], 'status': 'success', 'url': m3u8_url})
            else:
                results.append({'channel': channel['name'], 'status': 'save_failed'})
        else:
            print(f"❌ No stream URL found for {channel['name']}")
            results.append({'channel': channel['name'], 'status': 'failed'})
        
        time.sleep(2)
    
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
