import requests
import re
import json
import os
import time
import base64

def login_to_alkass(session, auth_token=None, username=None, password=None):
    """
    Login to Alkass website using either token or credentials
    """
    if auth_token:
        # If using bearer token authentication
        session.headers.update({
            'Authorization': f'Bearer {auth_token}'
        })
        print("✅ Using token authentication")
        return True
    
    elif username and password:
        # Traditional login form
        login_url = "https://shoof.alkass.net/login"
        login_data = {
            'email': username,
            'password': password,
        }
        
        try:
            # Get login page first to capture CSRF token if needed
            response = session.get(login_url)
            
            # Look for CSRF token (common in login forms)
            csrf_pattern = r'name="[^"]*[cC]srf[^"]*" value="([^"]+)"'
            csrf_match = re.search(csrf_pattern, response.text)
            if csrf_match:
                login_data['csrf_token'] = csrf_match.group(1)
            
            # Perform login
            login_headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': login_url
            }
            
            response = session.post(login_url, data=login_data, headers=login_headers)
            response.raise_for_status()
            
            # Check if login successful
            if (session.cookies.get('sessionid') or 
                session.cookies.get('auth_token') or 
                'dashboard' in response.url.lower()):
                print("✅ Login successful")
                return True
            else:
                print("❌ Login failed")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    else:
        print("❌ No authentication method provided")
        return False

def get_livestream_m3u8_url(session, url, channel_name):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://shoof.alkass.net/'
        }
        
        response = session.get(url, headers=headers)
        response.raise_for_status()
        
        # Check if redirected to login
        if 'login' in response.url.lower():
            print(f"❌ Access denied for {channel_name}")
            return None
        
        html_content = response.text
        
        # Method 1: Look for hls URL in sourceConfig
        pattern = r'"hls":\s*"([^"]+)"'
        match = re.search(pattern, html_content)
        if match:
            return match.group(1)
        
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
                hls_pattern = r'"hls":\s*"([^"]+)"'
                hls_match = re.search(hls_pattern, config_str)
                if hls_match:
                    return hls_match.group(1)
        
        # Method 3: Generic m3u8 search
        m3u8_pattern = r'https?://[^\s"\']+\.m3u8[^\s"\']*'
        m3u8_matches = re.findall(m3u8_pattern, html_content)
        if m3u8_matches:
            return m3u8_matches[0]
        
        return None
        
    except Exception as e:
        print(f"❌ Error fetching {url}: {e}")
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
    # Get credentials from environment variables (GitHub Secrets)
    auth_token = os.getenv('ALKASS_AUTH_TOKEN')
    username = os.getenv('ALKASS_USERNAME')
    password = os.getenv('ALKASS_PASSWORD')
    
    if not any([auth_token, username, password]):
        print("❌ No authentication credentials found in environment variables")
        print("Please set ALKASS_AUTH_TOKEN or ALKASS_USERNAME and ALKASS_PASSWORD")
        return
    
    # Create session
    s = requests.Session()
    
    # Authenticate
    if auth_token:
        login_success = login_to_alkass(s, auth_token=auth_token)
    else:
        login_success = login_to_alkass(s, username=username, password=password)
    
    if not login_success:
        print("❌ Authentication failed")
        return
    
    # Directory to save output files
    output_dir = "links/qa"
    os.makedirs(output_dir, exist_ok=True)
    
    # Channels to process
    channels = [
        {"url": "https://shoof.alkass.net/live?ch=one", "name": "alkass1"},
        {"url": "https://shoof.alkass.net/live?ch=two", "name": "alkass2"},
        {"url": "https://shoof.alkass.net/live?ch=three", "name": "alkass3"},
        {"url": "https://shoof.alkass.net/live?ch=four", "name": "alkass4"},
        {"url": "https://shoof.alkass.net/live?ch=five", "name": "alkass5"},
        {"url": "https://shoof.alkass.net/live?ch=six", "name": "alkass6"}
    ]
    
    print("Fetching livestream m3u8 URLs...")
    print(f"Output directory: {output_dir}")
    print("-" * 50)
    
    results = []
    for channel in channels:
        print(f"\nProcessing {channel['name']}...")
        
        m3u8_url = get_livestream_m3u8_url(s, channel['url'], channel['name'])
        
        if m3u8_url:
            print(f"✅ Found: {m3u8_url}")
            save_m3u8_url(channel['name'], m3u8_url, output_dir)
            results.append({'channel': channel['name'], 'status': 'success'})
        else:
            print(f"❌ Not found")
            results.append({'channel': channel['name'], 'status': 'failed'})
        
        time.sleep(1)
    
    # Summary
    print("\n" + "=" * 50)
    success_count = sum(1 for r in results if r['status'] == 'success')
    print(f"Results: {success_count}/{len(channels)} successful")

if __name__ == "__main__":
    main()
