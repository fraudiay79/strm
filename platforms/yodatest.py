import requests
import re
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options

# Directory to save output files
output_dir = "links/mt"
os.makedirs(output_dir, exist_ok=True)

# Headers to match browser behavior
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    "Referer": "https://yodaplayer.yodacdn.net/",
    "Origin": "https://yodaplayer.yodacdn.net/",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "en-US,en;q=0.9",
    "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
}

# URL to fetch tokens dynamically
url = "https://yodaplayer.yodacdn.net/"

# Function to get token via Selenium if JavaScript renders it
def get_token_via_selenium():
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Run without opening a browser window
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    try:
        driver.get(url)
        page_source = driver.page_source
        token_match = re.search(r'data-token="([a-zA-Z0-9_-]+)"', page_source)
        driver.quit()
        
        if token_match:
            return token_match.group(1)
        else:
            print("Error: Token not found in JavaScript-rendered content.")
            return None
    except Exception as e:
        print(f"Error fetching token via Selenium: {e}")
        driver.quit()
        return None

# First attempt via normal request
response = requests.get(url, headers=headers, timeout=10)

if response.status_code == 200:
    site_content = response.text

    match = re.search(r'data-token="([a-zA-Z0-9_-]+)"', site_content)

    if not match:
        print("Token not found using standard request. Trying Selenium...")
        token = get_token_via_selenium()  # Try using Selenium if direct request fails
    else:
        token = match.group(1)

    if token:
        names = ["aztv", "xazar"]
        
        for name in names:
            m3u8_url = f"https://str.yodacdn.net/{name}/video.m3u8?token={token}"
            print(f"Extracted M3U8 URL for {name}: {m3u8_url}")

            # Fetch m3u8 content
            content_response = requests.get(m3u8_url, headers=headers)
            
            if content_response.status_code == 200:
                content = content_response.text
                lines = content.split("\n")
                modified_content = ""

                for line in lines:
                    line = line.strip()
                    if line.startswith("tracks"):
                        full_url = f"https://str.yodacdn.net/{name}/" + line
                        modified_content += full_url + "\n"
                    else:
                        modified_content += line + "\n"

                print(f"\n--- Modified M3U8 Content for {name} ---\n")
                print(modified_content)
            else:
                print(f"Failed to fetch m3u8 content for {name}.")
    else:
        print("Final Error: Token not retrieved from any method.")
else:
    print("Failed to fetch the website content.")
