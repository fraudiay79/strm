import requests

# URL of the API
api_url = "https://api.tv8.md/v1/live"

try:
    # Make a GET request to fetch data from the API
    response = requests.get(api_url)
    response.raise_for_status()  # Raise an exception for HTTP errors
    data = response.json()  # Parse the JSON response
    
    # Extract the liveUrl value
    live_url = data.get("liveUrl")
    if not live_url:
        print("Error: liveUrl not found in the API response.")
        exit()
    
    # Fetch the content of the liveUrl
    live_response = requests.get(live_url)
    live_response.raise_for_status()
    
    # Write the content to an m3u8 file
    with open("tv8md.m3u8", "w") as file:
        file.write(live_response.text)
    
    print("m3u8 file created successfully as 'tv8md.m3u8'")
except requests.exceptions.RequestException as e:
    print(f"HTTP Request failed: {e}")
except Exception as e:
    print(f"An error occurred: {e}")
