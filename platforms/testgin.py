import time
import requests
import xml.etree.ElementTree as ET
import re
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

# Define the URL
url = "https://www.giniko.com/xml/secure/plist.php?ch=440"

# Initialize Selenium WebDriver
chrome_driver_path = "path/to/chromedriver"  # Replace with your actual ChromeDriver path
service = Service(chrome_driver_path)
driver = webdriver.Chrome(service=service)

try:
    # Open the webpage
    driver.get(url)
    time.sleep(3)  # Allow time for the page to load

    # Extract page source
    page_source = driver.page_source

finally:
    driver.quit()  # Close the browser session

# Parse XML from page source
try:
    root = ET.fromstring(page_source)

    # Find the first M3U8 URL
    m3u8_url = None
    for element in root.findall(".//string"):
        if "m3u8" in element.text:
            m3u8_url = element.text
            break

    if m3u8_url:
        print(f"Extracted M3U8 URL: {m3u8_url}")

        # Fetch the M3U8 content
        content_response = requests.get(m3u8_url)

        if content_response.status_code == 200:
            content = content_response.text
            lines = content.split("\n")
            modified_content = ""

            # Extract base URL
            base_url_match = re.match(r"(https://.*/)", m3u8_url)
            base_url = base_url_match.group(1) if base_url_match else ""

            # Modify M3U8 content
            for line in lines:
                line = line.strip()
                if line.startswith("tracks-"):
                    full_url = base_url + line
                    modified_content += full_url + "\n"
                else:
                    modified_content += line + "\n"

            print(modified_content)
        else:
            print("Failed to fetch M3U8 content.")
    else:
        print("Live stream URL not found in the page source.")
except ET.ParseError:
    print("Failed to parse XML from the page source.")
