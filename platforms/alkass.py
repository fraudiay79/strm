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

def login_to_alkass(session, username, password):
    """
    Login to Alkass website with proper headers and form handling
    """
    try:
        # First, get the login page to capture any required tokens and cookies
        login_page_url = "https://shoof.alkass.net/login"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        # Get login page
        print("🔄 Loading login page...")
        response = session.get(login_page_url, headers=headers)
        response.raise_for_status()
        
        # Look for CSRF token, authenticity token, or other hidden fields
        tokens = {}
        
        # Common token patterns
        token_patterns = [
            r'name="csrf_token" value="([^"]+)"',
            r'name="csrf" value="([^"]+)"',
            r'name="authenticity_token" value="([^"]+)"',
            r'name="token" value="([^"]+)"',
            r'name="_token" value="([^"]+)"',
            r'csrf-token" content="([^"]+)"',
            r'csrfToken" value="([^"]+)"',
        ]
        
        for pattern in token_patterns:
            match = re.search(pattern, response.text)
            if match:
                token_name = re.search(r'name="([^"]+)"', pattern).group(1) if 'name=' in pattern else 'csrf_token'
                tokens[token_name] = match.group(1)
                print(f"🔑 Found token: {token_name}")
        
        # Prepare login data
        login_data = {
            'email': username,
            'password': password,
        }
        
        # Add any found tokens to login data
        login_data.update(tokens)
        
        # Try different possible login endpoints
        login_endpoints = [
            'https://shoof.alkass.net/login',
            'https://shoof.alkass.net/auth/login',
            'https://shoof.alkass.net/signin',
            'https://shoof.alkass.net/api/login',
        ]
        
        # Update headers for POST request
        post_headers = headers.copy()
        post_headers.update({
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://shoof.alkass.net',
            'Referer': login_page_url,
            'X-Requested-With': 'XMLHttpRequest',  # Some sites expect AJAX
        })
        
        success = False
        for endpoint in login_endpoints:
            print(f"🔄 Trying login endpoint: {endpoint}")
            try:
                login_response = session.post(
                    endpoint,
                    data=login_data,
                    headers=post_headers,
                    allow_redirects=True
                )
                
                # Check if login was successful
                if login_response.status_code == 200:
                    # Check for success indicators in response
                    if any(indicator in login_response.text.lower() for indicator in ['success', 'dashboard', 'welcome', 'logout']):
                        print("✅ Login successful!")
                        success = True
                        break
                    # Check if we have session cookies
                    elif session.cookies and any('session' in cookie.name.lower() or 'auth' in cookie.name.lower() for cookie in session.cookies):
                        print("✅ Login successful (session cookies detected)!")
                        success = True
                        break
                    else:
                        print(f"⚠️  Endpoint {endpoint} returned 200 but no clear success indicator")
                elif login_response.status_code == 302 or login_response.status_code == 303:
                    # Redirect often indicates successful login
                    print("✅ Login successful (redirect detected)!")
                    success = True
                    break
                else:
                    print(f"❌ Endpoint {endpoint} returned status: {login_response.status_code}")
                    
            except requests.RequestException as e:
                print(f"❌ Error with endpoint {endpoint}: {e}")
                continue
        
        if not success:
            print("❌ All login attempts failed")
            # Debug: print available cookies
            print("🍪 Current cookies:", dict(session.cookies))
            
        return success
        
    except Exception as e:
        print(f"❌ Login error: {e}")
        return False

def debug_website_access(session, url):
    """Debug function to check website access"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
        
        response = session.get(url, headers=headers)
        print(f"🔍 Debug - URL: {url}")
        print(f"🔍 Debug - Status: {response.status_code}")
        print(f"🔍 Debug - Final URL: {response.url}")
        print(f"🔍 Debug - Cookies: {dict(session.cookies)}")
        
        # Check if we're being redirected to login
        if 'login' in response.url.lower():
            print("❌ Redirected to login page - authentication required")
            return False
        
        return response.status_code == 200
        
    except Exception as e:
        print(f"❌ Debug access error: {e}")
        return False

def get_livestream_m3u8_url(session, url, channel_name):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Referer': 'https://shoof.alkass.net/',
            'Accept-Language': 'en-US,en;q=0.9',
        }
        
        print(f"🔄 Fetching stream page for {channel_name}...")
        response = session.get(url, headers=headers)
        
        # Check if access is denied
        if response.status_code == 403 or 'login' in response.url.lower():
            print(f"❌ Access denied for {channel_name} - authentication required")
            return None
        
        response.raise_for_status()
        
        html_content = response.text
        
        # Save HTML for debugging if needed
        debug_dir = get_script_directory().parent / "debug"
        os.makedirs(debug_dir, exist_ok=True)
        with open(debug_dir / f"{channel_name}_page.html", "w", encoding="utf-8") as f:
            f.write(html_content)
        
        # Method 1: Look for hls URL in sourceConfig
        pattern = r'"hls":\s*"([^"]+)"'
        match = re.search(pattern, html_content)
        if match:
            m3u8_url = match.group(1)
            print(f"✅ Found HLS URL via pattern 1")
            return m3u8_url
        
        # Method 2: Look for bitmovin player configuration
        pattern2 = r'var sourceConfig\s*=\s*({[^}]+})'
        match2 = re.search(pattern2, html_content)
        if match2:
            config_str = match2.group(1)
            try:
                config = json.loads(config_str)
                if 'hls' in config:
                    print(f"✅ Found HLS URL via bitmovin config")
                    return config['hls']
            except json.JSONDecodeError:
                hls_pattern = r'"hls":\s*"([^"]+)"'
                hls_match = re.search(hls_pattern, config_str)
                if hls_match:
                    print(f"✅ Found HLS URL via bitmovin string extraction")
                    return hls_match.group(1)
        
        # Method 3: Generic m3u8 search
        m3u8_pattern = r'https?://[^\s"\']+\.m3u8[^\s"\']*'
        m3u8_matches = re.findall(m3u8_pattern, html_content)
        if m3u8_matches:
            print(f"✅ Found HLS URL via generic pattern")
            return m3u8_matches[0]
        
        print(f"❌ No m3u8 URL found in HTML for {channel_name}")
        return None
        
    except Exception as e:
        print(f"❌ Error fetching {url}: {e}")
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
    # Get credentials from environment variables
    username = os.getenv('ALKASS_USERNAME')
    password = os.getenv('ALKASS_PASSWORD')
    
    if not username or not password:
        print("❌ No credentials found in environment variables")
        print("Please set ALKASS_USERNAME and ALKASS_PASSWORD")
        return
    
    print("🚀 Starting Alkass stream URL fetcher...")
    
    # Create session with persistent cookies
    s = requests.Session()
    
    # First, debug access without login
    print("\n🔍 Testing website access without login...")
    debug_website_access(s, "https://shoof.alkass.net/")
    
    # Attempt login
    print("\n🔐 Attempting login...")
    login_success = login_to_alkass(s, username, password)
    
    if not login_success:
        print("❌ Authentication failed - cannot proceed")
        # Try to access anyway in case the site works without login
        print("🔄 Trying to access streams without authentication...")
    
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
        
        m3u8_url = get_livestream_m3u8_url(s, channel['url'], channel['name'])
        
        if m3u8_url:
            print(f"✅ Found: {m3u8_url[:80]}...")
            save_success = save_m3u8_url(channel['name'], m3u8_url, output_dir)
            if save_success:
                results.append({'channel': channel['name'], 'status': 'success'})
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
    
    print(f"\n🎯 Successfully retrieved: {success_count}/{len(channels)} channels")
    
    # List created files
    print(f"\n📄 Created files in {output_dir}:")
    for file in output_dir.glob("*.m3u8"):
        print(f"  - {file.name}")

if __name__ == "__main__":
    main()
