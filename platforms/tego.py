import requests
import os
import json

# Define the authentication API URL to fetch the access token
auth_url = "https://api.siberapi.com/sso/get_guest_token.php?app_id=1"

# List of streaming URLs
streaming_urls = [
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/1?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/2?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/4?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1",
    "https://mw.siberapi.com/api/ui/stb/v3/Channels/27?device_id=AA:AA:AA:AA:AA:AA&device=web&application_id=1"
]

# Corresponding names for the output files
names = ["ttt", "synergy", "wpg10", "lfn"]

# Directory to save output files
output_dir = "links"
os.makedirs(output_dir, exist_ok=True)

# **Step 1: Fetch the access_token**
def fetch_access_token():
    try:
        response = requests.get(auth_url)
        response.raise_for_status()
        token_data = response.json()
        
        if "access_token" in token_data:
            return token_data["access_token"]
        else:
            print("Error: access_token not found in authentication response.")
            return None

    except requests.exceptions.RequestException as e:
        print(f"Error fetching access_token: {e}")
        return None

# **Step 2: Fetch the ?token= from the first streaming URL**
def fetch_token_from_first_url(access_token):
    first_url = streaming_urls[0]  # Use the first streaming URL
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    
    try:
        response = requests.get(first_url, headers=headers)
        response.raise_for_status()
        response_json = response.json()

        if "tv_channel" in response_json.get("response", {}) and response_json["response"]["tv_channel"]:
            mastlnk = response_json["response"]["tv_channel"][0].get("streaming_url")
            if mastlnk and "?token=" in mastlnk:
                return mastlnk.split("?token=")[1]  # Extract the token value
        
        print("Error: Streaming token not found in first API response.")
        return None

    except requests.exceptions.RequestException as e:
        print(f"Error fetching streaming token from {first_url}: {e}")
        return None

# Fetch access_token first
access_token = fetch_access_token()

if access_token:
    print("Access Token Retrieved:", access_token)
    
    # Fetch token from first streaming URL
    streaming_token = fetch_token_from_first_url(access_token)

    if streaming_token:
        print("Streaming Token Retrieved:", streaming_token)

        # Process each URL using the same streaming token
        for url, name in zip(streaming_urls, names):
            base_url = url.split("?")[0]  # Extract base part of the URL
            modified_link = f"{base_url}?token={streaming_token}"

            # Save the modified streaming URL
            output_file = os.path.join(output_dir, f"{name}.m3u8")
            with open(output_file, "w") as file:
                file.write(modified_link)

            print(f"Created file: {output_file}")

    else:
        print("Failed to retrieve a valid streaming token. Script terminated.")

else:
    print("Failed to retrieve a valid access_token. Script terminated.")
