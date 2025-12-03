import re
import requests
from urllib.parse import urljoin

class LightcastM3U8Extractor:
    def __init__(self, base_url=None):
        self.base_url = base_url or "https://www.lightcast.com/embed/"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        })
    
    def extract_config_url(self, html_content):
        """Extract configUrl from the initial page"""
        # Look for var configUrl pattern
        pattern = r"var\s+configUrl\s*=\s*['\"]([^'\"]+)['\"]"
        match = re.search(pattern, html_content)
        
        if not match:
            # Try alternative pattern
            pattern = r"configUrl\s*:\s*['\"]([^'\"]+)['\"]"
            match = re.search(pattern, html_content)
        
        if match:
            config_path = match.group(1)
            return urljoin(self.base_url, config_path)
        
        return None
    
    def extract_playlist_url(self, json_content):
        """Extract playlist URL from the config response"""
        # Look for the playlist/sources pattern in the JavaScript-like JSON
        pattern = r'playlist:\s*\[\s*\{\s*title:\s*"[^"]+",\s*sources:\s*\[\s*\{\s*file:\s*"([^"]+)",'
        match = re.search(pattern, json_content)
        
        if not match:
            # Try alternative pattern
            pattern = r'file:\s*"([^"]+)"\s*,\s*type:\s*"m3u8"'
            match = re.search(pattern, json_content)
        
        if match:
            playlist_path = match.group(1)
            return urljoin(self.base_url, playlist_path)
        
        return None
    
    def get_final_m3u8(self, initial_url):
        """Complete process to get the final m3u8 playlist"""
        print(f"Step 1: Accessing initial URL: {initial_url}")
        
        # Step 1: Get initial page
        try:
            response = self.session.get(initial_url, timeout=10)
            response.raise_for_status()
            print(f"✓ Initial page loaded successfully (Status: {response.status_code})")
            
            # Save initial page for debugging
            with open('debug_initial_page.html', 'w', encoding='utf-8') as f:
                f.write(response.text)
            print("✓ Saved initial page to debug_initial_page.html")
            
        except requests.exceptions.RequestException as e:
            print(f"✗ Failed to load initial page: {e}")
            return None
        
        # Step 2: Extract config URL
        config_url = self.extract_config_url(response.text)
        if not config_url:
            print("✗ Could not find configUrl in the initial page")
            print("Debug: Searching for configUrl patterns...")
            
            # Try to find any JavaScript variable containing 'config'
            config_patterns = [
                r"configUrl\s*=\s*['\"]([^'\"]+)['\"]",
                r"config\s*=\s*\{[^}]*url\s*:\s*['\"]([^'\"]+)['\"]",
                r"['\"]configUrl['\"]\s*:\s*['\"]([^'\"]+)['\"]",
            ]
            
            for pattern in config_patterns:
                match = re.search(pattern, response.text)
                if match:
                    print(f"Found alternative pattern: {match.group(0)[:100]}...")
                    config_path = match.group(1)
                    config_url = urljoin(self.base_url, config_path)
                    break
            
            if not config_url:
                return None
        
        print(f"✓ Extracted config URL: {config_url}")
        
        # Step 3: Get config page with specific headers
        config_headers = {
            'Referer': initial_url,
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
        }
        
        try:
            print(f"\nStep 3: Accessing config URL with headers:")
            print(f"  Referer: {initial_url}")
            print(f"  X-Requested-With: XMLHttpRequest")
            print(f"  User-Agent: Chrome 142.0.0.0")
            
            response = self.session.get(config_url, headers=config_headers, timeout=10)
            response.raise_for_status()
            print(f"✓ Config page loaded successfully (Status: {response.status_code})")
            
            # Save config response for debugging
            with open('debug_config_response.txt', 'w', encoding='utf-8') as f:
                f.write(response.text)
            print("✓ Saved config response to debug_config_response.txt")
            
        except requests.exceptions.RequestException as e:
            print(f"✗ Failed to load config page: {e}")
            if hasattr(e.response, 'text'):
                print(f"Response content: {e.response.text[:500]}")
            return None
        
        # Step 4: Extract playlist URL
        playlist_url = self.extract_playlist_url(response.text)
        if not playlist_url:
            print("✗ Could not find playlist URL in config response")
            print("Debug: First 2000 chars of config response:")
            print(response.text[:2000])
            
            # Try alternative extraction methods
            print("\nTrying alternative extraction methods...")
            
            # Method 1: Look for any URL containing "playlist_m3u8"
            playlist_pattern = r'"([^"]*playlist_m3u8[^"]*)"'
            matches = re.findall(playlist_pattern, response.text)
            if matches:
                print(f"Found potential playlist URLs: {matches[:3]}")
                for match in matches[:3]:
                    if not match.startswith('http'):
                        playlist_url = urljoin(self.base_url, match)
                        print(f"Trying: {playlist_url}")
                        break
            
            # Method 2: Look for JSON structure with file property
            if not playlist_url:
                json_pattern = r'"file"\s*:\s*"([^"]+)"'
                matches = re.findall(json_pattern, response.text)
                if matches:
                    for match in matches:
                        if 'm3u8' in match.lower() or 'playlist' in match.lower():
                            if not match.startswith('http'):
                                playlist_url = urljoin(self.base_url, match)
                                print(f"Found via JSON pattern: {playlist_url}")
                                break
            
            if not playlist_url:
                return None
        
        print(f"\n✓ Extracted playlist URL: {playlist_url}")
        
        # Step 5: Get final m3u8 playlist
        playlist_headers = {
            'Referer': config_url,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Origin': 'https://www.lightcast.com'
        }
        
        try:
            print(f"\nStep 5: Accessing playlist URL...")
            response = self.session.get(playlist_url, headers=playlist_headers, timeout=10)
            response.raise_for_status()
            
            # Check if we got an m3u8 file
            content = response.text.strip()
            if content.startswith('#EXTM3U'):
                print("✓ Successfully retrieved m3u8 playlist!")
                return content
            else:
                print("⚠ Response is not a valid m3u8 file")
                print(f"Response starts with: {content[:200]}")
                
                # Check if it might be JSON containing the m3u8 URL
                if 'm3u8' in content.lower() or 'http' in content:
                    print("Content contains potential m3u8 references, returning as-is")
                return content
                
        except requests.exceptions.RequestException as e:
            print(f"✗ Failed to load playlist: {e}")
            if hasattr(e.response, 'text'):
                print(f"Response content: {e.response.text[:500]}")
            return None
    
    def save_m3u8(self, m3u8_content, filename="playlist.m3u8"):
        """Save the m3u8 content to a file"""
        if m3u8_content:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(m3u8_content)
            print(f"✓ M3U8 playlist saved to {filename}")
            return True
        return False
    
    def extract_direct_stream_urls(self, m3u8_content):
        """Extract direct stream URLs from the m3u8 playlist"""
        if not m3u8_content:
            return []
        
        urls = []
        lines = m3u8_content.split('\n')
        
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#') and (line.startswith('http://') or line.startswith('https://')):
                urls.append(line)
        
        return urls
    
    def extract_all_urls(self, content):
        """Extract all URLs from content for debugging"""
        url_pattern = r'https?://[^\s<>"\'{}|\\^`\[\]]+'
        return re.findall(url_pattern, content)

def main():
    # Initialize the extractor
    extractor = LightcastM3U8Extractor()
    
    # The initial URL
    initial_url = "https://www.lightcast.com/embed/player.php?id=49983&type=live&multiBitrate=1"
    
    print("=" * 70)
    print("LIGHTCAST M3U8 PLAYLIST EXTRACTOR")
    print("=" * 70)
    print(f"Target URL: {initial_url}")
    print(f"User Agent: Chrome 142.0.0.0")
    print("=" * 70)
    
    # Get the final m3u8
    m3u8_content = extractor.get_final_m3u8(initial_url)
    
    if m3u8_content:
        print("\n" + "=" * 70)
        print("EXTRACTION SUCCESSFUL!")
        print("=" * 70)
        
        # Display first part of content
        print("\nM3U8 Playlist (first 800 chars):")
        print("-" * 70)
        if len(m3u8_content) > 800:
            print(m3u8_content[:800] + "...")
        else:
            print(m3u8_content)
        print("-" * 70)
        
        # Save to file
        extractor.save_m3u8(m3u8_content, "lightcast_playlist.m3u8")
        
        # Extract direct stream URLs
        stream_urls = extractor.extract_direct_stream_urls(m3u8_content)
        if stream_urls:
            print(f"\n✓ Found {len(stream_urls)} direct stream URL(s):")
            for i, url in enumerate(stream_urls, 1):
                print(f"{i}. {url[:100]}..." if len(url) > 100 else f"{i}. {url}")
        else:
            print("\nℹ No direct stream URLs found in m3u8")
            
            # Try to extract any URLs for debugging
            all_urls = extractor.extract_all_urls(m3u8_content)
            if all_urls:
                print(f"\nFound {len(all_urls)} URLs in content:")
                for i, url in enumerate(all_urls[:5], 1):
                    print(f"{i}. {url[:120]}..." if len(url) > 120 else f"{i}. {url}")
    else:
        print("\n" + "=" * 70)
        print("EXTRACTION FAILED")
        print("=" * 70)
        print("Check debug files:")
        print("  - debug_initial_page.html")
        print("  - debug_config_response.txt")
        print("\nPossible issues:")
        print("  1. The website structure may have changed")
        print("  2. Additional headers or cookies may be required")
        print("  3. The stream may be georestricted or offline")

if __name__ == "__main__":
    main()
