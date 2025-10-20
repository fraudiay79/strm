import requests
import json
import re
import os

def extract_channel_info():
    url = "https://uvotv.com/api/web/live-channels/v2/regions/252/channels?limit=500&offset=0"
    output_dir = "links/uvo"
    
    try:
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Fetch the JSON data from the URL
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for bad status codes
        
        data = response.json()
        
        # Check if the request was successful
        if data.get("errorCode") is not None:
            print(f"API returned an error: {data.get('message')}")
            return
        
        # Extract channels from payload
        channels = data.get("payload", {}).get("results", [])
        
        if not channels:
            print("No channels found in the response.")
            return
        
        print(f"Found {len(channels)} channels")
        print("-" * 50)
        
        # Extract id and name from URL for each channel
        channel_list = []
        
        for channel in channels:
            channel_id = channel.get("id")
            channel_url = channel.get("url", "")
            
            # Extract name from URL using regex
            name_match = re.search(r'/([^/]+)/playlist\.m3u8$', channel_url)
            channel_name = name_match.group(1) if name_match else "unknown"
            
            channel_info = {
                "id": channel_id,
                "name": channel_name
            }
            
            channel_list.append(channel_info)
            print(f"ID: {channel_id}, Name: {channel_name}")
        
        print("-" * 50)
        print(f"Successfully extracted {len(channel_list)} channels")
        
        # Save to JSON file in the specified directory
        output_file = os.path.join(output_dir, "uvo.json")
        with open(output_file, "w") as f:
            json.dump(channel_list, f, indent=2)
        print(f"Data saved to '{output_file}'")
        
        return channel_list
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    extract_channel_info()
