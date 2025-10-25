#!/usr/bin/env python3
import requests
from urllib.parse import urljoin, urlparse, urlunparse, parse_qs, urlencode
import argparse
import os
import sys
import time
import logging
from pathlib import Path
from typing import Dict, Tuple, Optional

class M3U8TokenUpdater:
    def __init__(self):
        self.session = requests.Session()
        self.setup_headers()
        self.setup_logging()
        
    def setup_headers(self):
        """Set up common headers for all requests."""
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
            'Referer': 'https://snrt.player.easybroadcast.io/',
            'Origin': 'https://snrt.player.easybroadcast.io'
        })
        
    def setup_logging(self, verbose: bool = False):
        """Set up logging configuration."""
        level = logging.DEBUG if verbose else logging.INFO
        logging.basicConfig(
            level=level,
            format='%(asctime)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        self.logger = logging.getLogger(__name__)
        
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
                time.sleep(attempt + 1)  # Exponential backoff
        return None
        
    def fetch_token(self, api_url: str) -> Tuple[str, str, str]:
        """Fetch token from EasyBroadcast API."""
        self.logger.debug(f"Fetching token from: {api_url}")
        
        response = self.fetch_with_retry(api_url)
        if not response:
            raise RuntimeError(f"Failed to fetch token after retries: {api_url}")
            
        try:
            data = parse_qs(response.text)
        except Exception as e:
            raise RuntimeError(f"Failed to parse token response: {e}")
            
        required_keys = {"token", "token_path", "expires"}
        if not all(key in data for key in required_keys):
            missing = required_keys - set(data.keys())
            raise RuntimeError(f"Invalid token response format. Missing keys: {missing}")
            
        # Validate values
        for key in required_keys:
            if not data[key] or not data[key][0]:
                raise RuntimeError(f"Empty value for required key: {key}")
                
        return data["token"][0], data["token_path"][0], data["expires"][0]
        
    def extract_channel_id(self, url: str) -> str:
        """Extract channel ID from URL."""
        # Parse the URL and extract the path segment after /abr_corp/
        parsed = urlparse(url)
        path_parts = parsed.path.split('/')
        
        try:
            # Find the index of 'abr_corp' and get the next segment
            abr_corp_index = path_parts.index('abr_corp')
            if abr_corp_index + 1 < len(path_parts):
                return path_parts[abr_corp_index + 1]
        except ValueError:
            pass
            
        # Fallback: try to extract using string methods
        if '/abr_corp/' in url:
            parts = url.split('/abr_corp/')[1].split('/')
            if parts:
                return parts[0]
                
        raise ValueError(f"Could not extract channel ID from URL: {url}")
        
    def build_signed_url(self, base_url: str, token: str, token_path: str, expires: str) -> str:
        """Build signed URL with proper parameter encoding."""
        params = {
            'token': token,
            'token_path': token_path,
            'expires': expires
        }
        return f"{base_url}?{urlencode(params)}"
        
    def process_m3u8_file(self, file_path: str, base_url: str, token: str, token_path: str, expires: str) -> bool:
        """Process M3U8 file and update segment URLs with tokens."""
        self.logger.debug(f"Processing M3U8 file: {file_path}")
        
        # Read original file
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except IOError as e:
            self.logger.error(f"Failed to read file {file_path}: {e}")
            return False
            
        # Extract channel ID
        try:
            channel_id = self.extract_channel_id(base_url)
        except ValueError as e:
            self.logger.error(f"{e}")
            return False
            
        # Process each line
        processed_lines = []
        for line in content.splitlines():
            line = line.strip()
            if not line or line.startswith('#'):
                processed_lines.append(line)
            elif line.startswith('http'):
                # This is a segment URL - reconstruct it with proper structure
                try:
                    # Extract the quality-specific path (everything after channel_id)
                    parsed_segment = urlparse(line)
                    segment_path = parsed_segment.path
                    
                    # Find the channel_id in the segment path and get everything after it
                    if f'/{channel_id}/' in segment_path:
                        quality_path = segment_path.split(f'/{channel_id}/', 1)[1]
                        new_base_url = f"https://cdn.live.easybroadcast.io/abr_corp/{channel_id}/{quality_path}"
                        signed_url = self.build_signed_url(new_base_url, token, token_path, expires)
                        processed_lines.append(signed_url)
                    else:
                        # Fallback: use original line if channel_id not found
                        self.logger.warning(f"Channel ID {channel_id} not found in segment URL, using original: {line}")
                        processed_lines.append(line)
                except Exception as e:
                    self.logger.warning(f"Error processing segment URL {line}: {e}, using original")
                    processed_lines.append(line)
            else:
                processed_lines.append(line)
                
        # Create backup and write processed content
        backup_path = f"{file_path}.bak"
        try:
            # Create backup
            Path(file_path).rename(backup_path)
            
            # Write processed content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(processed_lines))
                
            # Remove backup if successful
            os.remove(backup_path)
            return True
            
        except Exception as e:
            # Restore from backup if something went wrong
            self.logger.error(f"Failed to write processed file {file_path}: {e}")
            try:
                if os.path.exists(backup_path):
                    Path(backup_path).rename(file_path)
                    self.logger.info("Restored original file from backup")
            except Exception as restore_error:
                self.logger.error(f"Failed to restore backup: {restore_error}")
            return False
            
    def process_all_streams(self, streams: Dict[str, str], verbose: bool = False) -> Tuple[int, int]:
        """Process all streams in the configuration."""
        self.setup_logging(verbose)
        success_count = 0
        fail_count = 0
        
        self.logger.info(f"Starting M3U8 token update for {len(streams)} streams")
        
        for file_path, base_url in streams.items():
            self.logger.info(f"Processing: {file_path}")
            
            # Check if source file exists
            if not os.path.exists(file_path):
                self.logger.error(f"Source file not found: {file_path}")
                fail_count += 1
                continue
                
            try:
                # Fetch token
                token_api_url = f"https://token.easybroadcast.io/all?url={base_url}"
                token, token_path, expires = self.fetch_token(token_api_url)
                
                # Process the M3U8 file
                if self.process_m3u8_file(file_path, base_url, token, token_path, expires):
                    self.logger.info(f"Successfully updated: {file_path}")
                    success_count += 1
                else:
                    self.logger.error(f"Failed to process: {file_path}")
                    fail_count += 1
                    
            except Exception as e:
                self.logger.error(f"Error processing {file_path}: {e}")
                fail_count += 1
                
            self.logger.info("---")
            
        self.logger.info(f"Process completed: {success_count} successful, {fail_count} failed")
        return success_count, fail_count

def main():
    # Define streams configuration (same as bash script)
    streams = {
        "links/ma/aloula.m3u8": "https://cdn.live.easybroadcast.io/abr_corp/73_aloula_w1dqfwm/playlist_dvr.m3u8",
        "links/ma/almaghribia.m3u8": "https://cdn.live.easybroadcast.io/abr_corp/73_almaghribia_83tz85q/playlist_dvr.m3u8",
        "links/ma/arryadia.m3u8": "https://cdn.live.easybroadcast.io/abr_corp/73_arryadia_k2tgcj0/playlist_dvr.m3u8",
        "links/ma/arryadiatnt.m3u8": "https://cdn.live.easybroadcast.io/abr_corp/73_arryadia-tnt_zcmwjdc/playlist_dvr.m3u8",
        "links/ma/assadissa.m3u8": "https://cdn.live.easybroadcast.io/abr_corp/73_assadissa_7b7u5n1/playlist_dvr.m3u8",
        "links/ma/athaqafia.m3u8": "https://cdn.live.easybroadcast.io/abr_corp/73_arrabia_hthcj4p/playlist_dvr.m3u8",
        "links/ma/laayoune.m3u8": "https://cdn.live.easybroadcast.io/abr_corp/73_laayoune_pgagr52/playlist_dvr.m3u8",
        "links/ma/tamazight.m3u8": "https://cdn.live.easybroadcast.io/abr_corp/73_tamazight_tccybxt/playlist_dvr.m3u8"
    }
    
    parser = argparse.ArgumentParser(description="Update M3U8 playlist tokens for EasyBroadcast streams")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose output")
    parser.add_argument("--config", "-c", help="Custom configuration file (not implemented)")
    args = parser.parse_args()
    
    # Create updater instance
    updater = M3U8TokenUpdater()
    
    try:
        success_count, fail_count = updater.process_all_streams(streams, args.verbose)
        
        if fail_count > 0:
            sys.exit(1)
            
    except KeyboardInterrupt:
        updater.logger.info("Process interrupted by user")
        sys.exit(1)
    except Exception as e:
        updater.logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
