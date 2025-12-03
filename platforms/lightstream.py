import re
import requests
from urllib.parse import urljoin, urlparse, parse_qs, urlencode

class LightcastM3U8Extractor:
    def __init__(self, base_url=None):
        self.base_url = base_url or "https://www.lightcast.com/embed/"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
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
        except requests.exceptions.RequestException as e:
            print(f"✗ Failed to load initial page: {e}")
            return None
        
        # Step 2: Extract config URL
        config_url = self.extract_config_url(response.text)
        if not config_url:
            print("✗ Could not find configUrl in the initial page")
            return None
        
        print(f"✓ Extracted config URL: {config_url}")
        
        # Step 3: Get config page
        try:
            response = self.session.get(config_url, timeout=10)
            response.raise_for_status()
            print(f"✓ Config page loaded successfully (Status: {response.status_code})")
        except requests.exceptions.RequestException as e:
            print(f"✗ Failed to load config page: {e}")
            return None
        
        # Step 4: Extract playlist URL
        playlist_url = self.extract_playlist_url(response.text)
        if not playlist_url:
            print("✗ Could not find playlist URL in config response")
            print("Debug: First 1000 chars of config response:")
            print(response.text[:1000])
            return None
        
        print(f"✓ Extracted playlist URL: {playlist_url}")
        
        # Step 5: Get final m3u8 playlist
        try:
            response = self.session.get(playlist_url, timeout=10)
            response.raise_for_status()
            
            # Check if we got an m3u8 file
            if response.text.strip().startswith('#EXTM3U'):
                print("✓ Successfully retrieved m3u8 playlist!")
                return response.text
            else:
                print("✗ Response is not a valid m3u8 file")
                print(f"Response starts with: {response.text[:100]}")
                return response.text
                
        except requests.exceptions.RequestException as e:
            print(f"✗ Failed to load playlist: {e}")
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

def main():
    # Initialize the extractor
    extractor = LightcastM3U8Extractor()
    
    # The initial URL
    initial_url = "https://www.lightcast.com/embed/player.php?id=49983&type=live&multiBitrate=1"
    
    print("=" * 60)
    print("Lightcast M3U8 Playlist Extractor")
    print("=" * 60)
    
    # Get the final m3u8
    m3u8_content = extractor.get_final_m3u8(initial_url)
    
    if m3u8_content:
        print("\n" + "=" * 60)
        print("M3U8 Playlist Content:")
        print("=" * 60)
        print(m3u8_content[:500] + "..." if len(m3u8_content) > 500 else m3u8_content)
        
        # Save to file
        extractor.save_m3u8(m3u8_content)
        
        # Extract direct stream URLs
        stream_urls = extractor.extract_direct_stream_urls(m3u8_content)
        if stream_urls:
            print(f"\n✓ Found {len(stream_urls)} direct stream URL(s):")
            for i, url in enumerate(stream_urls, 1):
                print(f"{i}. {url}")
    else:
        print("\n✗ Failed to extract m3u8 playlist")

if __name__ == "__main__":
    main()
