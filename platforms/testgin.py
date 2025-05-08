import time
import requests
import xml.etree.ElementTree as ET
import re
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

# Define the URL
url = "https://www.giniko.com/xml/secure/plist.php?ch=440"

# Define the headers
headers = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "en-US,en;q=0.9",
    "sec-ch-ua": "\"Chromium\";v=\"136\", \"Google Chrome\";v=\"136\", \"Not.A/Brand\";v=\"99\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    "Referer": "https://www.giniko.com/watch.php?id=186",
    "Cookie": "_pk_id.5.ac7a=e820b13d673baa9e.1745434587.; PHPSESSID=frabcgi9htt8blspmrlg91iq77; __utmc=52549950; __utmz=52549950.1745873900.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); __utma=52549950.1725668953.1745434587.1745873900.1746705347.3; __utmt=1; _pk_ref.5.ac7a=%5B%22%22%2C%22%22%2C1746705347%2C%22https%3A%2F%2Fwww.google.com%2F%22%5D; _pk_ses.5.ac7a=1; sc_is_visitor_unique=rx9849145.1746705364.83ABBD63A8534269BDCAD5ED3545F548.3.3.3.3.3.3.3.3.2; __utmb=52549950.2.10.1746705347"
}

# Set up Selenium with headers
chrome_options = Options()
chrome_options.add_argument("--headless")  # Run in headless mode
chrome_options.add_argument(f"user-agent={headers['sec-ch-ua']}")

chrome_driver_path = "path/to/chromedriver"  # Replace with actual path
service = Service(chrome_driver_path)
driver = webdriver.Chrome(service=service, options=chrome_options)

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

        # Fetch the M3U8 content with headers
        content_response = requests.get(m3u8_url, headers=headers)

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
