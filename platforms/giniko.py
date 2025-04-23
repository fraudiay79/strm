# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET
import os
import json

# Directory to save output files
output_dir = "links"
os.makedirs(output_dir, exist_ok=True)

def fetch_data(url, headers=None):
    """
    Centralized function for HTTP GET requests
    """
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response
    except Exception as e:
        print(f"Error fetching URL {url}: {e}")
        return None

def fetch_xml_content(url, headers=None):
    """
    Fetch and return raw XML content from the specified URL
    """
    response = fetch_data(url, headers)
    if response:
        return response.text
    return None

def extract_wmsAuthSign_from_xml(xml_content):
    """
    Parse XML content and extract the 'wmsAuthSign' token
    """
    try:
        root = ET.fromstring(xml_content)
        for elem in root.iter("string"):
            if "wmsAuthSign=" in elem.text:
                sign_index = elem.text.index("?wmsAuthSign=") + len("?wmsAuthSign=")
                token = elem.text[sign_index:]
                return token
        return None
    except Exception as e:
        print(f"Error parsing XML content: {e}")
        return None

def Resolve():
    """
    Main function to process the JSON configuration, fetch data, 
    and generate playlist files for each channel
    """
    try:
        # Load the JSON configuration from 'giniko.json'
        with open("giniko.json", "r", encoding="utf-8") as file:
            config = json.load(file)
        
        # Iterate through the sources in the JSON configuration
        for source in config:
            if "channels" not in source:
                print("No channels found in the configuration.")
                continue

            # Base URL with placeholders
            base_url = source.get("url", "")
            if not base_url:
                print("No URL found in the source configuration.")
                continue

            headers = source.get("headers", {})
            user_agent = headers.get('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
            headers['User-Agent'] = user_agent  # Ensure User-Agent is set
            
            # Fetch XML content and extract 'wmsAuthSign' token
            xml_content = fetch_xml_content(base_url, headers)
            wmsAuthSign_token = extract_wmsAuthSign_from_xml(xml_content)
            if not wmsAuthSign_token:
                print(f"Unable to fetch 'wmsAuthSign' token for {base_url}. Skipping source.")
                continue
            
            # Process each channel in the source
            for channel in source["channels"]:
                channel_name = channel.get("name", "Unknown Channel")
                variables = channel.get("variables", [])
                channel_variable = next((var["value"] for var in variables if var["name"] == "CHANNEL_NAME"), None)

                if not channel_variable:
                    print(f"Skipping {channel_name}: Missing 'CHANNEL_NAME' variable.")
                    continue

                # Format URL by replacing placeholder
                url = base_url.replace("CHANNEL_NAME", channel_variable)
                
                try:
                    # Fetch data from the URL
                    response = fetch_data(url, headers)
                    if not response:
                        print(f"Failed to fetch data for {channel_name}.")
                        continue
                    
                    # Parse JSON response
                    data = response.json()
                    if not data or "data" not in data or not data["data"]:
                        print(f"Invalid API response for {channel_name}.")
                        continue
                    
                    # Extract threadAddress
                    thread_address = data["data"][0].get("threadAddress")
                    if not thread_address:
                        print(f"Thread address missing for {channel_name}.")
                        continue
                    
                    # Define variations for streaming
                    variations = [
                        {
                            "average_bandwidth": 1210000,
                            "bandwidth": 1510000,
                            "resolution": "854x480",
                            "codec": "avc1.4d401f,mp4a.40.2",
                            "track": "index.m3u8"
                        }
                    ]
                    
                    # Create an output file for the channel
                    output_file = os.path.join(output_dir, f"{channel_name}.m3u8")
                    with open(output_file, "w", encoding="utf-8") as file:
                        file.write(f"#EXTM3U\n")
                        for variation in variations:
                            modified_link = thread_address.replace("index.m3u8", variation["track"]) + f"?wmsAuthSign={wmsAuthSign_token}"
                            file.write(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH={variation["average_bandwidth"]},BANDWIDTH={variation["bandwidth"]},RESOLUTION={variation["resolution"]},FRAME-RATE=29.970,CODECS="{variation["codec"]}",CLOSED-CAPTIONS=NONE\n')
                            file.write(f"{modified_link}\n")
                    
                    print(f"Playlist created for {channel_name}: {output_file}")
                    
                except Exception as e:
                    print(f"Error processing {channel_name}: {e}")
    
    except FileNotFoundError:
        print("The file 'giniko.json' was not found.")
    except json.JSONDecodeError:
        print("Error decoding 'giniko.json'. Ensure it's valid JSON.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

# Main entry point
if __name__ == "__main__":
    Resolve()
