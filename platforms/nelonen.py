#!/usr/bin/python3

import requests
import json
import os
import base64
import time
import logging
from typing import Dict, Tuple, Optional

VARIATIONS = {
    "hls-index_9": (1209948, "768x432", 1517906),
    "hls-index_10": (2027339, "1024x576", 2571659),
    "hls-index_11": (3764296, "1280x720", 4810886),
    "hls-index_12": (5296904, "1920x1080", 6786673),
}

class NelonenMediaStream:
    def __init__(self):
        self.session = requests.Session()
        self.setup_headers()
        self.setup_logging()
        
    def setup_headers(self):
        """Set up common headers for all requests."""
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.nelonen.fi/',
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://www.nelonen.fi'
        })
        
    def setup_logging(self):
        """Set up logging configuration."""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        self.logger = logging.getLogger(__name__)

    def is_token_expired(self, jwt_token: str) -> bool:
        """Check if JWT token is expired."""
        try:
            if not jwt_token or '.' not in jwt_token:
                return True
                
            payload_encoded = jwt_token.split('.')[1]
            # Add padding if necessary
            padding = 4 - len(payload_encoded) % 4
            if padding != 4:
                payload_encoded += '=' * padding
                
            payload_bytes = base64.urlsafe_b64decode(payload_encoded)
            payload = json.loads(payload_bytes)
            exp = payload.get("exp")
            
            if exp:
                current_time = int(time.time())
                # Consider token expired if it's within 60 seconds of expiry
                return current_time > (exp - 60)
            return True
            
        except Exception as e:
            self.logger.warning(f"Token decode error: {e}")
            return True

    def fetch_with_retry(self, url: str, max_retries: int = 3, timeout: int = 10) -> Optional[requests.Response]:
        """Fetch URL with retry logic using session."""
        for attempt in range(max_retries):
            try:
                response = self.session.get(url, timeout=timeout)
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                self.logger.warning(f"Attempt {attempt + 1}/{max_retries} failed for {url}: {e}")
                if attempt == max_retries - 1:
                    raise
                time.sleep(1 * (attempt + 1))
        return None

    def get_stream_data(self, url: str, max_retries: int = 3) -> Optional[dict]:
        """Get stream data from Nelonen Media API."""
        for attempt in range(max_retries):
            try:
                response = self.fetch_with_retry(url)
                if not response:
                    continue
                    
                data = response.json()
                
                # Navigate through the response structure safely
                clip = data.get("clip", {})
                playback = clip.get("playback", {})
                media = playback.get("media", {})
                stream_urls = media.get("streamUrls", {})
                android = stream_urls.get("android", {})
                
                if android and "url" in android:
                    token = android.get("token")
                    if token and self.is_token_expired(token) and attempt < max_retries - 1:
                        self.logger.info("🔁 Token expired, retrying...")
                        continue
                    return android
                    
            except (KeyError, ValueError, requests.RequestException) as e:
                self.logger.warning(f"Attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(1)
                    
        self.logger.error(f"Failed to get stream data after {max_retries} attempts")
        return None

    def validate_master_url(self, url: str) -> bool:
        """Validate the master URL format."""
        return url.startswith(('http://', 'https://')) and 'hls-index' in url

    def generate_variant_url(self, master_url: str, variant: str) -> str:
        """Generate variant URL by replacing hls-index with the specific variant."""
        return master_url.replace("hls-index", variant)

    def write_playlist(self, output_file: str, master_url: str) -> bool:
        """Write M3U8 playlist with all variants."""
        try:
            with open(output_file, "w", encoding='utf-8') as file:
                file.write("#EXTM3U\n")
                file.write("#EXT-X-VERSION:3\n")
                file.write("#EXT-X-INDEPENDENT-SEGMENTS\n")
                
                for variant, (avg_bw, res, bw) in VARIATIONS.items():
                    variant_url = self.generate_variant_url(master_url, variant)
                    
                    file.write(
                        f'#EXT-X-STREAM-INF:CODECS="avc1.4D401F,mp4a.40.2",'
                        f'AVERAGE-BANDWIDTH={avg_bw},RESOLUTION={res},'
                        f'VIDEO-RANGE=SDR,FRAME-RATE=25.0,BANDWIDTH={bw}\n'
                    )
                    file.write(f"{variant_url}\n")
                    
            return True
            
        except IOError as e:
            self.logger.error(f"File write error for {output_file}: {e}")
            return False

    def process_streams(self):
        """Main method to process all streams."""
        urls = [
            "https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584964",
            "https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2582939",
            "https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584968",
            "https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584966"
        ]

        names = ["jim", "nelonen", "liv", "hero"]
        output_dir = "links/fi"
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)

        success_count = 0
        total_count = len(urls)

        for url, name in zip(urls, names):
            self.logger.info(f"Processing {name} from {url}")
            
            android_block = self.get_stream_data(url)
            if not android_block or "url" not in android_block:
                self.logger.error(f"❌ Failed to get stream URL for {name}")
                continue

            master_url = android_block["url"]
            
            if not self.validate_master_url(master_url):
                self.logger.error(f"❌ Invalid URL format for {name}: {master_url}")
                continue

            output_file = os.path.join(output_dir, f"{name}.m3u8")
            
            if self.write_playlist(output_file, master_url):
                self.logger.info(f"✅ Saved: {output_file}")
                success_count += 1
            else:
                self.logger.error(f"❌ Failed to write playlist for {name}")

        self.logger.info(f"Process completed: {success_count}/{total_count} successful")
        return success_count == total_count

def main():
    """Main entry point."""
    stream_processor = NelonenMediaStream()
    
    try:
        success = stream_processor.process_streams()
        return 0 if success else 1
        
    except KeyboardInterrupt:
        stream_processor.logger.info("Process interrupted by user")
        return 1
    except Exception as e:
        stream_processor.logger.error(f"Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
