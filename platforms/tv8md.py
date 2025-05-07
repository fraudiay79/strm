import requests
import re
import os
import json
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options

# Set up Selenium for headless browsing
def get_api_url_via_selenium():
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Run without opening a browser window
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)

    try:
        driver.get("https://tv8.md/live")
        page_source = driver.page_source
        api_match = re.search(r'https://api.tv8.md/v1/live', page_source)  # Extract API URL if generated dynamically
        driver.quit()

        if api_match:
            return api_match.group(0)  # Return the extracted API URL
        else:
            print("Error: API URL not found using Selenium.")
            return None
    except Exception as e:
        print(f"Error fetching API URL via Selenium: {e}")
        driver.quit()
        return None

# Use Selenium first to retrieve API URL
api_url = get_api_url_via_selenium()

# If Selenium fails, use the default API URL
if not api_url:
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

# Base URL for media streams
base_url = "https://live.cdn.tv8.md/TV7/"

# Step 1: Fetch JSON data from the API
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
