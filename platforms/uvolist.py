import requests
import json
import re
import os

def extract_channel_info_from_url(url, region_id):
    """Extract channel information from a single URL"""
    try:
        # Fetch the JSON data from the URL
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for bad status codes
        
        data = response.json()
        
        # Check if the request was successful
        if data.get("errorCode") is not None:
            print(f"API returned an error for region {region_id}: {data.get('message')}")
            return []
        
        # Extract channels from payload
        channels = data.get("payload", {}).get("results", [])
        
        if not channels:
            print(f"No channels found in region {region_id}.")
            return []
        
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
                "name": channel_name,
                "region_id": region_id
            }
            
            channel_list.append(channel_info)
        
        print(f"Region {region_id}: Found {len(channel_list)} channels")
        return channel_list
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data for region {region_id}: {e}")
        return []
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON for region {region_id}: {e}")
        return []
    except Exception as e:
        print(f"An unexpected error occurred for region {region_id}: {e}")
        return []

def extract_all_channel_info():
    # Define all URLs with their region IDs
    urls = [
        ("https://uvotv.com/api/web/live-channels/v2/regions/252/channels?limit=500&offset=0", 252),
        ("https://uvotv.com/api/web/live-channels/v2/regions/230/channels?limit=500&offset=0", 230),
        ("https://uvotv.com/api/web/live-channels/v2/regions/257/channels?limit=500&offset=0", 257),
        ("https://uvotv.com/api/web/live-channels/v2/regions/167/channels?limit=500&offset=0", 167),
        ("https://uvotv.com/api/web/live-channels/v2/regions/101/channels?limit=500&offset=0", 101),
        ("https://uvotv.com/api/web/live-channels/v2/regions/255/channels?limit=500&offset=0", 255),
        ("https://uvotv.com/api/web/live-channels/v2/regions/108/channels?limit=500&offset=0", 108)
    ]
    
    output_dir = "links/lst"
    
    try:
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        all_channels = []
        total_channels = 0
        
        print("Starting extraction from all regions...")
        print("-" * 50)
        
        # Process each URL
        for url, region_id in urls:
            channels = extract_channel_info_from_url(url, region_id)
            all_channels.extend(channels)
            total_channels += len(channels)
        
        print("-" * 50)
        print(f"Successfully extracted {total_channels} channels from {len(urls)} regions")
        
        # Remove duplicates based on channel ID (in case same channel appears in multiple regions)
        unique_channels = {}
        for channel in all_channels:
            channel_id = channel["id"]
            if channel_id not in unique_channels:
                unique_channels[channel_id] = channel
            else:
                # If channel already exists, add the region to the existing entry
                if "regions" not in unique_channels[channel_id]:
                    unique_channels[channel_id]["regions"] = [unique_channels[channel_id]["region_id"]]
                unique_channels[channel_id]["regions"].append(channel["region_id"])
        
        # Convert back to list and remove individual region_id if we have multiple regions
        final_channels = []
        for channel_id, channel_data in unique_channels.items():
            if "regions" in channel_data:
                # If multiple regions, keep the regions list and remove individual region_id
                channel_data.pop("region_id", None)
            final_channels.append(channel_data)
        
        print(f"After deduplication: {len(final_channels)} unique channels")
        
        # Save to JSON file in the specified directory
        output_file = os.path.join(output_dir, "channels.json")
        with open(output_file, "w") as f:
            json.dump(final_channels, f, indent=2)
        print(f"Data saved to '{output_file}'")
        
        # Also save a summary file with region counts
        summary = {
            "total_regions": len(urls),
            "total_channels_before_deduplication": total_channels,
            "total_unique_channels": len(final_channels),
            "regions_processed": [region_id for _, region_id in urls]
        }
        
        summary_file = os.path.join(output_dir, "extraction_summary.json")
        with open(summary_file, "w") as f:
            json.dump(summary, f, indent=2)
        print(f"Summary saved to '{summary_file}'")
        
        return final_channels
        
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return []

if __name__ == "__main__":
    extract_all_channel_info()
