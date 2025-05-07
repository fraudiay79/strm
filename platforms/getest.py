import requests
import os
import json

# Function to get the authorization bearer token
def get_bearer_token():
    auth_url = "https://api.myvideo.ge/api/v1/auth/token"
    payload = {
        "client_id": 7,
        "grant_type": "client_implicit"
    }
    headers = {
        "accept": "application/json",
        "content-type": "application/x-www-form-urlencoded",
        "origin": "https://tv.myvideo.ge",
        "referer": "https://tv.myvideo.ge/"
    }

    response = requests.post(auth_url, data=payload, headers=headers)

    if response.status_code == 200:
        return response.json().get("access_token")
    else:
        print(f"Failed to obtain token: {response.status_code} - {response.text}")
        return None

# Directory to save output files
output_dir = "links/ge"
os.makedirs(output_dir, exist_ok=True)

# List of URLs and corresponding names
urls = [
    "https://api.myvideo.ge/api/v1/channel/chunk/gpbhd",
    "https://api.myvideo.ge/api/v1/channel/chunk/pirvelitv",
    "https://api.myvideo.ge/api/v1/channel/chunk/mtavari",
    # Add more URLs as needed...
]

names = [
    "gpbhd", "pirvelitv", "mtavari",
    # Add corresponding names...
]

# Get bearer token
bearer_token = get_bearer_token()
if not bearer_token:
    exit("No valid token obtained, exiting.")

# Define headers with authentication, origin, and referer
headers = {
    "accept": "application/json, text/plain, */*",
    "authorization": f"Bearer {bearer_token}",
    "referer": "https://tv.myvideo.ge/",
    "origin": "https://tv.myvideo.ge"
}

# Loop through each URL and corresponding name
for url, name in zip(urls, names):
    base_url = f"http://nue01-edge03.itdc.ge/{name}/"

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()

        json_data = response.json()
        file_url = json_data.get("data", {}).get("attributes", {}).get("file")

        if not file_url:
            print(f"Error: 'file' key missing for {name}.")
            continue

        content_response = requests.get(file_url, headers=headers)
        content_response.raise_for_status()

        content = content_response.text
        lines = content.split("\n")
        modified_content = ""

        for line in lines:
            line = line.strip()
            if not line:
                continue
            if not line.startswith("#") and not line.startswith("http"):
                full_url = base_url + line
                modified_content += full_url + "\n"
            else:
                modified_content += line + "\n"

        output_file = os.path.join(output_dir, f"{name}.m3u8")
        with open(output_file, "w") as file:
            file.write(modified_content)

        print(f"Created file: {output_file}")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data for {name}: {e}")
        
