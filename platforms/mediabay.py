# -*- coding: utf-8 -*-
import requests
import os
import json

# Directory to save output files
output_dir = "links"
os.makedirs(output_dir, exist_ok=True)

def Resolve():
    try:
        # Load the JSON configuration from 'mediabay.json'
        with open("mediabay.json", "r", encoding="utf-8") as file:
            config = json.load(file)
        
        # Iterate through the channels in the JSON
        for source in config:
            if "channels" not in source:
                print("No channels found in the configuration.")
                continue

            # Base URL with placeholders
            base_url = source.get("url", "")
            if not base_url:
                print("No URL found in the source configuration.")
                continue
            
            # Headers (optional in JSON)
            headers = source.get("headers", {})
            user_agent = headers.get('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
            headers['User-Agent'] = user_agent  # Ensure User-Agent is set
            
            for channel in source["channels"]:
                # Get channel name and variables
                channel_name = channel.get("name", "Unknown Channel")
                variables = channel.get("variables", [])
                
                # Extract 'CHANNEL_NAME' variable value
                channel_variable = next((var["value"] for var in variables if var["name"] == "CHANNEL_NAME"), None)
                if not channel_variable:
                    print(f"Skipping {channel_name}: Missing 'CHANNEL_NAME' variable.")
                    continue

                # Format URL by replacing placeholder
                url = base_url.replace("CHANNEL_NAME", channel_variable)
                
                try:
                    # Fetch data from the URL
                    response = requests.get(url, headers=headers)
                    response.raise_for_status()  # Raise exception for HTTP errors
                    
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
                            "average_bandwidth": 650000,
                            "bandwidth": 810000,
                            "resolution": "426x240",
                            "codec": "avc1.4d0015,mp4a.40.2",
                            "track": "tracks-v3a1/mono.m3u8"
                        },
                        {
                            "average_bandwidth": 1170000,
                            "bandwidth": 1470000,
                            "resolution": "640x360",
                            "codec": "avc1.4d001e,mp4a.40.2",
                            "track": "tracks-v2a1/mono.m3u8"
                        },
                        {
                            "average_bandwidth": 2420000,
                            "bandwidth": 3030000,
                            "resolution": "854x480",
                            "codec": "avc1.4d001e,mp4a.40.2",
                            "track": "tracks-v1a1/mono.m3u8"
                        }
                    ]
                    
                    # Create an output file for the channel
                    output_file = os.path.join(output_dir, f"{channel_name}.m3u8")
                    with open(output_file, "w", encoding="utf-8") as file:
                        file.write(f"#EXTM3U\n")
                        for variation in variations:
                            modified_link = thread_address.replace("playlist.m3u8", variation["track"])
                            file.write(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH={variation["average_bandwidth"]},BANDWIDTH={variation["bandwidth"]},RESOLUTION={variation["resolution"]},FRAME-RATE=25.000,CODECS="{variation["codec"]}",CLOSED-CAPTIONS=NONE\n')
                            file.write(f"{modified_link}\n")
                    
                    print(f"Playlist created for {channel_name}: {output_file}")
                    
                except requests.exceptions.RequestException as e:
                    print(f"Error fetching data for {channel_name}: {e}")
                except IOError as e:
                    print(f"Error writing file for {channel_name}: {e}")
    
    except FileNotFoundError:
        print("The file 'mediabay.json' was not found.")
    except json.JSONDecodeError:
        print("Error decoding 'mediabay.json'. Ensure it's valid JSON.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

# Main entry point
if __name__ == "__main__":
    Resolve()
