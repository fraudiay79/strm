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
        if method == "GET":
            response = requests.get(url, headers=headers)
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
        response = requests.get(url)
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
        return ""
    except Exception as e:
        print(f"Error fetching playlist from {url}: {e}")
        return ""

def main():
    """
    Main function to process all channels and create individual m3u8 files
    """
    if len(sys.argv) < 2:
        print("Usage: python giniko.py <config_file>")
        sys.exit(1)
    
    config_file = sys.argv[1]
    
    try:
        with open(config_file, "r", encoding="utf-8") as f:
            giniko_config = json.load(f)
    except FileNotFoundError:
        print(f"Error: Config file {config_file} not found")
        return
    except json.JSONDecodeError as e:
        print(f"Error parsing {config_file}: {e}")
        return
    
    for site in giniko_config:
        site_path = os.path.join(site["slug"])
        os.makedirs(site_path, exist_ok=True)
        
        print(f"Processing {site['name']}...")
        
        for channel in tqdm(site["channels"], desc=f"Channels for {site['name']}"):
            # Create filename using slugify
            channel_file_path = os.path.join(site_path, slugify(channel["name"].lower()) + ".m3u8")
            
            # Build the channel URL by replacing variables
            channel_url = site["url"]
            for variable in channel["variables"]:
                channel_url = channel_url.replace(variable["name"], variable["value"])
            
            # Get the stream URL from XML
            stream_url = get_stream_url(
                channel_url, 
                method=site.get("method", "GET"), 
                headers=site.get("headers", {})
            )
            
            if not stream_url:
                # Remove existing file if no stream URL found
                if os.path.isfile(channel_file_path):
                    os.remove(channel_file_path)
                continue
            
            # Check output filter if specified
            if site.get("output_filter") and site["output_filter"] not in stream_url:
                if os.path.isfile(channel_file_path):
                    os.remove(channel_file_path)
                continue
            
            # Generate playlist content based on mode
            mode = site.get("mode", "variant")
            if mode == "variant":
                text = playlist_text(stream_url)
            elif mode == "master":
                bandwidth = site.get("bandwidth", "1000000")
                text = f"#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-STREAM-INF:BANDWIDTH={bandwidth}\n{stream_url}\n"
            else:
                print(f"Wrong or missing playlist mode: {mode}")
                text = ""
            
            # Write the playlist file
            if text:
                with open(channel_file_path, "w", encoding="utf-8") as channel_file:
                    channel_file.write(text)
                print(f"✓ Created {channel_file_path}")
            else:
                # Remove file if no content
                if os.path.isfile(channel_file_path):
                    os.remove(channel_file_path)
                print(f"✗ No content for {channel['name']}")

if __name__ == "__main__":
    main()
