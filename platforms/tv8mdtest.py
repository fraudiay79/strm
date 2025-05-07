import requests

base_url = "https://live.cdn.tv8.md/TV7/"
api_url = "https://api.tv8.md/v1/live"

# Define custom headers
headers = {
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "Referer": "https://tv8.md/live",
    "Origin": "https://tv8.md"
}

# Step 1: Fetch JSON data with headers
response = requests.get(api_url, headers=headers)

if response.status_code == 200:
    json_data = response.json()
    live_url = json_data.get("liveUrl")

    if live_url:
        # Step 2: Fetch content from liveUrl with headers
        content_response = requests.get(live_url, headers=headers)
        
        if content_response.status_code == 200:
            content = content_response.text
            lines = content.split("\n")
            modified_content = ""

            for line in lines:
                if ".ts" in line or ".m3u8" in line:
                    full_url = base_url + line
                else:
                    full_url = line
                
                modified_content += full_url + "\n"

            print(modified_content)
        else:
            print("Failed to fetch content.")
    else:
        print("Live URL not found in the JSON response.")
else:
    print("Failed to fetch the API content.")
