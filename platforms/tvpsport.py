import streamlink
import requests

# Define the API link
url = "https://vod.tvp.pl/api/products/399702/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER"

try:
    # Send a GET request to fetch the JSON response
    response = requests.get(url)
    response.raise_for_status()  # Raise an HTTPError for bad responses (4xx and 5xx)
    
    # Parse the JSON response
    data = response.json()
    
    # Extract the DASH URL from the JSON structure
    dash_sources = data.get("sources", {}).get("DASH", [])
    if dash_sources:
        dash_url = dash_sources[0].get("src")
        if dash_url:
            print(dash_url)
        else:
            print("DASH source found, but no 'src' key available.")
    else:
        print("No DASH sources found in the response.")
except requests.exceptions.RequestException as e:
    print(f"An error occurred: {e}")
except KeyError as e:
    print(f"Key error: {e}")
