import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By

# URL to fetch the HTML content
url = "https://www.jurnaltv.md/page/live"

try:
    # Step 1: Use Selenium for dynamic extraction
    driver = webdriver.Chrome()  # Ensure you have ChromeDriver installed and added to PATH
    driver.get(url)

    # Find the script tag and extract the `file` value dynamically
    script_tag = driver.find_element(By.XPATH, "//script[contains(text(), 'file:')]")
    script_content = script_tag.get_attribute("innerText")

    # Extract the 'file' URL from the script content
    start_index = script_content.find('file:"') + len('file:"')
    end_index = script_content.find('",', start_index)
    m3u8_url = script_content[start_index:end_index]

    # Close the browser after extracting the m3u8 URL
    driver.quit()

    # Debug: Print the extracted m3u8 URL
    print(f"Extracted m3u8 URL (via Selenium): {m3u8_url}")

    # Step 2: Fallback to requests and BeautifulSoup if necessary
    response = requests.get(url, headers={"Cache-Control": "no-cache"})
    response.raise_for_status()  # Raise an exception for HTTP errors
    html_content = response.text

    # Parse the HTML content
    soup = BeautifulSoup(html_content, "html.parser")

    # Extract the 'file' URL from the <script> tag using BeautifulSoup as backup
    fallback_script_tag = soup.find("script", text=lambda t: t and "file:" in t)
    if fallback_script_tag and not m3u8_url:
        start_index = fallback_script_tag.text.find('file:"') + len('file:"')
        end_index = fallback_script_tag.text.find('",', start_index)
        m3u8_url = fallback_script_tag.text[start_index:end_index]

    # Extract the token value from the 'file' URL
    if "?token=" in m3u8_url:
        token = m3u8_url.split("?token=")[-1]

        # Debug: Print the extracted token
        print(f"Extracted Token: {token}")

        # Print the updated playlist
        print("#EXTM3U")
        print(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=1750000,BANDWIDTH=2190000,RESOLUTION=640x360,FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE')
        print(f"https://live.cdn.jurnaltv.md/JurnalTV_HD/tracks-v2a1/mono.ts.m3u8?token={token}")
        print(f'#EXT-X-STREAM-INF:AVERAGE-BANDWIDTH=2810000,BANDWIDTH=3510000,RESOLUTION=1024x576,FRAME-RATE=25.000,CODECS="avc1.4d4029,mp4a.40.2",CLOSED-CAPTIONS=NONE')
        print(f"https://live.cdn.jurnaltv.md/JurnalTV_HD/tracks-v1a1/mono.ts.m3u8?token={token}")
    else:
        print("Token not found in the m3u8 URL.")
except requests.RequestException as e:
    print(f"Failed to fetch the page: {e}")
except Exception as e:
    print(f"An error occurred: {e}")
