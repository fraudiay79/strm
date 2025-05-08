import time
import requests
import xml.etree.ElementTree as ET
import re
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium_stealth import stealth

# Define the URL
url = "https://www.giniko.com/xml/secure/plist.php?ch=440"

# Set up Chrome options (Headless mode enabled)
chrome_options = Options()
chrome_options.add_argument("--headless")  # Enables headless mode
chrome_options.add_argument("--disable-blink-features=AutomationControlled")  # Helps bypass detection
chrome_options.add_argument("--no-sandbox")  # Avoids sandbox issues in cloud environments
chrome_options.add_argument("--disable-dev-shm-usage")  # Prevents memory-related crashes
chrome_options.add_argument("--disable-gpu")  # Helps with headless stability

# Initialize Selenium WebDriver (Headless mode)
chrome_driver_path = "path/to/chromedriver"  # Replace with actual ChromeDriver path
service = Service(chrome_driver_path)
driver = webdriver.Chrome(service=service, options=chrome_options)

# Apply stealth settings to avoid bot detection
stealth(driver,
    languages=["en-US", "en"],
    vendor="Google Inc.",
    platform="Win32",
    webgl_vendor="Intel Inc.",
    renderer="Intel Iris OpenGL Engine",
    fix_hairline=True,
)

try:
    # Open the webpage
    driver.get(url)
    time.sleep(3)  # Allow time for dynamic content to load

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
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
            "Referer": "https://www.giniko.com/watch.php?id=186",
            "Cookie": "_pk_id.5.ac7a=e820b13d673baa9e.1745434587.; PHPSESSID=frabcgi9htt8blspmrlg91iq77;"
        }
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

            print("\nModified M3U8 Content:\n", modified_content)
        else:
            print("Failed to fetch M3U8 content.")
    else:
        print("Live stream URL not found in the page source.")
except ET.ParseError:
    print("Failed to parse XML from the page source.")
