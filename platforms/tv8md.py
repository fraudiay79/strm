import requests
import re
import os
import json
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options

# Set up Selenium for headless browsing
def get_live_url_via_selenium():
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Run without opening a browser window
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)

    try:
        driver.get("https://tv8.md/live")
        page_source = driver.page_source

        # Extract the live URL (with token)
        live_url_match = re.search(r'"liveUrl":"(https://live\.cdn\.tv8\.md/TV7/index\.m3u8\?token=[a-zA-Z0-9]+)"', page_source)
        driver.quit()

        if live_url_match:
            return live_url_match.group(1)  # Return the extracted live URL
        else:
            print("Error: Live URL not found using Selenium.")
            return None
    except Exception as e:
        print(f"Error fetching live URL via Selenium: {e}")
        driver.quit()
        return None

# Use Selenium first to retrieve live URL
live_url = get_live_url_via_selenium()

# If Selenium fails, try using the API request
if not live_url:
    print("Trying to fetch live URL via API request...")
    api_url = "https://api.tv8.md/v1/live"

    headers = {
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://tv8.md/live",
        "Origin": "https://tv8.md"
    }

    response = requests.get(api_url, headers=headers)

    if response.status_code == 200:
        json_data = response.json()
        live_url = json_data.get("liveUrl")

        if not live_url:
            print("Final Error: Live URL not retrieved from any method.")
            exit()
    else:
        print("Failed to fetch the API content.")
        exit()

# Base URL for media streams
base_url = "https://live.cdn.tv8.md/TV7/"

# Step 2: Fetch M3U8 content
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

    print(f"\n--- Modified M3U8 Content ---\n")
    print(modified_content)
else:
    print("Failed to fetch M3U8 content.")
