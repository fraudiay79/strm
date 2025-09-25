import requests
import xml.etree.ElementTree as ET
import json
import os
import sys
from urllib.parse import urljoin
from slugify import slugify
from tqdm import tqdm

def get_stream_url(url, method="GET", headers={}):
    """
    Fetch the XML content and extract the m3u8 URL from the LIVE stream
    """
    try:
        # Set default headers if none provided
        if not headers:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            }
        
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        else:
            print(f"Method {method} is not supported")
            return None
            
        response.raise_for_status()

        # Parse the XML content
        root = ET.fromstring(response.text)

        # Find all dict elements within arrays
        for channel_dict in root.findall(".//array/dict"):
            # Look for the LIVE stream specifically
            keys = channel_dict.findall("key")
            strings = channel_dict.findall("string")
            
            # Create a dictionary to store key-value pairs
            kv_pairs = {}
            for i in range(min(len(keys), len(strings))):
                if keys[i] is not None and keys[i].text and i < len(strings) and strings[i] is not None:
                    key = keys[i].text
                    value = strings[i].text
                    kv_pairs[key] = value
            
            # Check if this is the LIVE stream with index.m3u8
            if (kv_pairs.get('id') == 'LIVE' and 
                kv_pairs.get('HlsStreamURL') and 
                'index.m3u8' in kv_pairs.get('HlsStreamURL', '')):
                return kv_pairs['HlsStreamURL']
        
        # Fallback: find any stream with index.m3u8
        for channel_dict in root.findall(".//array/dict"):
            keys = channel_dict.findall("key")
            strings = channel_dict.findall("string")
            
            for i, key_elem in enumerate(keys):
                if key_elem.text == "HlsStreamURL" and i < len(strings):
                    value_elem = strings[i]
                    if value_elem.text and "index.m3u8" in value_elem.text:
                        return value_elem.text

        print(f"No m3u8 URL found for {url}")
        return None
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL {url}: {e}")
        return None
    except ET.ParseError as e:
        print(f"Error parsing XML content from {url}: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error processing {url}: {e}")
        return None

def playlist_text(url):
    """
    Fetch and process the m3u8 playlist content
    """
    try:
        text = ""
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code == 200:
            for line in response.iter_lines():
                line = line.decode('utf-8', errors='ignore')
                if not line:
                    continue
                if not line.startswith("#"):
                    # Resolve relative URLs to absolute
                    text += urljoin(url, line) + "\n"
                else:
                    text += line + "\n"
            return text
        else:
            print(f"HTTP Error {response.status_code} fetching playlist from {url}")
            return ""
    except Exception as e:
        print(f"Error fetching playlist from {url}: {e}")
        return ""

def main():
    """
    Main function to process all channels and create individual m3u8 files
    """
    # Check if config file argument is provided
    if len(sys.argv) < 2:
        print("Usage: python giniko.py <config_file>")
        print("Example: python giniko.py giniko.json")
        sys.exit(1)
    
    config_file = sys.argv[1]
    
    # Check if file exists
    if not os.path.isfile(config_file):
        print(f"Error: Config file '{config_file}' not found")
        print("Please make sure the file exists in the current directory")
        sys.exit(1)
    
    try:
        with open(config_file, "r", encoding="utf-8") as f:
            giniko_config = json.load(f)
        print(f"Successfully loaded configuration from {config_file}")
    except FileNotFoundError:
        print(f"Error: Config file {config_file} not found")
        return
    except json.JSONDecodeError as e:
        print(f"Error parsing {config_file}: {e}")
        return
    except Exception as e:
        print(f"Error reading {config_file}: {e}")
        return
    
    # Process each site in configuration
    for site in giniko_config:
        site_name = site.get("name", "Unknown")
        site_slug = site.get("slug", "links")
        site_path = os.path.join(site_slug)
        
        print(f"\nProcessing {site_name}...")
        print(f"Creating directory: {site_path}")
        
        os.makedirs(site_path, exist_ok=True)
        
        channels = site.get("channels", [])
        if not channels:
            print("No channels found in configuration")
            continue
            
        print(f"Found {len(channels)} channels to process")
        
        for channel in tqdm(channels, desc=f"Processing channels"):
            channel_name = channel.get("name", "unknown")
            channel_slug = slugify(channel_name.lower())
            channel_file_path = os.path.join(site_path, f"{channel_slug}.m3u8")
            
            # Build the channel URL by replacing variables
            channel_url = site["url"]
            for variable in channel.get("variables", []):
                channel_url = channel_url.replace(variable['name'], variable['value'])
            
            print(f"\nProcessing {channel_name}...")
            print(f"URL: {channel_url}")
            
            # Get the stream URL from XML
            stream_url = get_stream_url(
                channel_url, 
                method=site.get("method", "GET"), 
                headers=site.get("headers", {})
            )
            
            if not stream_url:
                print(f"✗ No stream URL found for {channel_name}")
                # Remove existing file if no stream URL found
                if os.path.isfile(channel_file_path):
                    os.remove(channel_file_path)
                continue
            
            print(f"✓ Found stream URL: {stream_url}")
            
            # Check output filter if specified
            output_filter = site.get("output_filter")
            if output_filter and output_filter not in stream_url:
                print(f"✗ Output filter '{output_filter}' not found in URL for {channel_name}")
                if os.path.isfile(channel_file_path):
                    os.remove(channel_file_path)
                continue
            
            # Generate playlist content based on mode
            mode = site.get("mode", "variant")
            text = ""
            
            if mode == "variant":
                print(f"Fetching variant playlist for {channel_name}...")
                text = playlist_text(stream_url)
            elif mode == "master":
                bandwidth = site.get("bandwidth", "1000000")
                text = f"#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH={bandwidth}\n{stream_url}\n"
            else:
                print(f"Warning: Unknown playlist mode '{mode}' for channel {channel_name}")
                # Default to variant mode
                text = playlist_text(stream_url)
            
            # Write the playlist file
            if text:
                try:
                    with open(channel_file_path, "w", encoding="utf-8") as channel_file:
                        channel_file.write(text)
                    print(f"✓ Successfully created {channel_file_path}")
                except Exception as e:
                    print(f"Error writing to {channel_file_path}: {e}")
            else:
                # Remove file if no content
                if os.path.isfile(channel_file_path):
                    os.remove(channel_file_path)
                print(f"✗ No playlist content for {channel_name}")

    print("\nProcessing complete!")

if __name__ == "__main__":
    main()
