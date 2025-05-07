import requests

# Step 1: Get JSON data from API
api_url = "https://api.tv8.md/v1/live"
response = requests.get(api_url)

if response.status_code == 200:
    json_data = response.json()  # Convert response to JSON
    live_url = json_data.get("liveUrl")  # Extract m3u8 link
    
    if live_url:
        # Step 2: Fetch the content from the live_url
        response = requests.get(live_url)
        
        if response.status_code == 200:
            content = response.text
            lines = content.splitlines()
            for line in lines:
                print(line)
        else:
            print(f"Failed to retrieve the file. Status code: {response.status_code}")
    else:
        print("Failed to extract the m3u8 link from the JSON response.")
else:
    print(f"Failed to retrieve the JSON data. Status code: {response.status_code}")
