import requests

base_url = "https://live.cdn.tv8.md/TV7/"
api_url = "https://api.tv8.md/v1/live"

# Step 1: Fetch JSON data
response = requests.get(api_url)

if response.status_code == 200:
    json_data = response.json()
    live_url = json_data.get("liveUrl")

    if live_url:
        # Step 2: Fetch content from liveUrl
        content_response = requests.get(live_url)
        
        if content_response.status_code == 200:
            content = content_response.text
            lines = content.split("\n")
            modified_content = ""

            for line in lines:
                full_url = base_url + line
                modified_content += full_url + "\n"

            print(modified_content)
else:
    print("Failed to fetch the API content.")
