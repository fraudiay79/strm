# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import os
import json

# URL to fetch the HTML content
url = "https://yodaplayer.yodacdn.net/"

# Directory to save output files
output_dir = "links"
os.makedirs(output_dir, exist_ok=True)

def Resolve(token):
    try:
        # Load the JSON configuration from 'yodaplayer.json'
        with open("yodaplayer.json", "r", encoding="utf-8") as file:
            config = json.load(file)
        
        # Iterate through the channels in the JSON configuration
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
            headers['User-Agent'] = headers.get(
                'User-Agent', 
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            )
            
            for channel in source["channels"]:
                # Get channel name and variables
                channel_name = channel.get("name", "Unknown Channel")
                variables = channel.get("variables", [])
                
                # Extract 'CHANNEL_NAME' variable value
                channel_variable = next(
                    (var["value"] for var in variables if var["name"] == "CHANNEL_NAME"), 
                    None
                )
                if not channel_variable:
                    print(f"Skipping {channel_name}: Missing 'CHANNEL_NAME' variable.")
                    continue

                # Format URL by replacing placeholder
                url = base_url.replace("CHANNEL_NAME", channel_variable)
                
                try:
                    # Define variations for streaming
                    variations = [
                        {
                            "average_bandwidth": 2080000,
                            "bandwidth": 2610000,
                            "resolution": "1048x576",
                            "codec": "avc1.4d401f,mp4a.40.2",
                            "track": "tracks-v1a1/mono.ts.m3u8"
                        },
                        {
                            "average_bandwidth": 6030000,
                            "bandwidth": 7540000,
                            "resolution": "1920x1080",
                            "codec": "avc1.4d401f,mp4a.40.2",
                            "track": "tracks-v1a1/mono.ts.m3u8"
                        }
                    ]
                    
                    # Create an output file for the channel
                    output_file = os.path.join(output_dir, f"{channel_name}.m3u8")
                    with open(output_file, "w", encoding="utf-8") as file:
                        file.write(f"#EXTM3U\n")
                        for variation in variations:
                            modified_link = url.replace("video.m3u8", variation["track"]) + f"?token={token}"
                            file.write(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH={variation["average_bandwidth"]},BANDWIDTH={variation["bandwidth"]},RESOLUTION={variation["resolution"]},FRAME-RATE=50.000,CODECS="{variation["codec"]}",CLOSED-CAPTIONS=NONE\n')
                            file.write(f"{modified_link}\n")
                    
                    print(f"Playlist created for {channel_name}: {output_file}")
                    
                except requests.exceptions.RequestException as e:
                    print(f"Error fetching data for {channel_name}: {e}")
                except IOError as e:
                    print(f"Error writing file for {channel_name}: {e}")
    
    except FileNotFoundError:
        print("The file 'yodaplayer.json' was not found.")
    except json.JSONDecodeError:
        print("Error decoding 'yodaplayer.json'. Ensure it's valid JSON.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

# Main entry point
if __name__ == "__main__":
    try:
        # Fetch the HTML content from the page
        response = requests.get(url, headers={"Cache-Control": "no-cache"})
        response.raise_for_status()  # Raise exception for HTTP errors
        html_content = response.text

        # Parse the HTML content
        soup = BeautifulSoup(html_content, "html.parser")

        # Extract the 'data-token' from the <div> tag
        div_tag = soup.find("div", class_="player-container")
        if div_tag and div_tag.has_attr("data-token"):
            token = div_tag["data-token"]
            print(f"Token extracted: {token}")
            Resolve(token)
        else:
            print("No 'data-token' attribute found in the HTML.")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching HTML content: {e}")
    except Exception as e:
        print(f"Unexpected error occurred: {e}")
