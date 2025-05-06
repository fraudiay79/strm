import requests
import os
import json

# Define the token URL
token_url = "https://api.siberapi.com/sso/get_guest_token.php?app_id=1"

# List of URLs to fetch JSON data
streaming_urls = [
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/1?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/2?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/4?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/27?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/5?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/6?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/7?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/8?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/9?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/10?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/11?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/13?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1"
]

# Corresponding names for the output files
names = [
    "ttt",
    "synergy",
    "wpg10",
    "lfntt",
    "jaagriti",
    "trinitytv",
    "bhaktitv",
    "ibntv",
    "wacktv",
    "abstv",
    "ietv",
    "plustv"
]

# Directory to save output files
output_dir = "links"
os.makedirs(output_dir, exist_ok=True)

# Fetch the access token
token_response = requests.get(token_url)
if token_response.status_code == 200:
    token_data = token_response.json()
    access_token = token_data.get("access_token")
    if access_token:
        print("Access Token Retrieved")

        # Adjusted Headers for API requests
        headers = {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "authorization": f"Bearer {access_token}",
            "priority": "u=1, i",
            "sec-ch-ua": "\"Chromium\";v=\"136\", \"Google Chrome\";v=\"136\", \"Not.A/Brand\";v=\"99\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site"
        }

        # Process each URL and save to corresponding file
        for url, name in zip(streaming_urls, names):
            try:
                resplink = requests.get(url, headers=headers)
                resplink.raise_for_status()
                response_json = resplink.json()

                mastlnk = response_json["response"]["tv_channel"][0].get("streaming_url")
                if not mastlnk:
                    print(f"Error: Unable to retrieve streaming URL from {url}.")
                    continue
                
                # Extract base URL and token
                base_url, token = mastlnk.split("?token=")

                # Generate multiple resolution variations
                variations = {
                    "tracks-v1a1": (440000, 350000, "256x144"),
                    "tracks-v2a1": (780000, 620000, "640x360"),
                    "tracks-v3a1": (1300000, 1040000, "1024x576"),
                    "tracks-v4a1": (1980000, 1580000, "1280x720"),
                }

                output_file = os.path.join(output_dir, f"{name}.m3u8")

                with open(output_file, "w") as file:
                    file.write("#EXTM3U\n")

                    for variant, (bandwidth, avg_bandwidth, resolution) in variations.items():
                        modified_link = f"{base_url}/{variant}/mono.m3u8?token={token}"
                        file.write(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH={avg_bandwidth},BANDWIDTH={bandwidth},RESOLUTION={resolution},FRAME-RATE=30.000,CODECS="avc1.4d401f,mp4a.40.2",CLOSED-CAPTIONS=NONE\n')
                        file.write(f"{modified_link}\n")

                print(f"Created file: {output_file}")

            except requests.exceptions.RequestException as e:
                print(f"Error fetching data from {url}: {e}")
            except (KeyError, IndexError, json.JSONDecodeError) as e:
                print(f"Error parsing JSON response from {url}: {e}")
    else:
        print("Access Token not found in response.")
else:
    print("Failed to fetch token. Status code:", token_response.status_code)
