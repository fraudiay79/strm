import os
import re
import requests
from playwright.sync_api import sync_playwright
from playwright_stealth import stealth_sync

# Directory setup
output_dir = "links/mt"
os.makedirs(output_dir, exist_ok=True)

# Target URLs & Names
urls = ["https://tvmi.mt/live/2", "https://tvmi.mt/live/3", "https://tvmi.mt/live/4"]
names = ["tvm", "tvmnews", "tvmsport"]

# Extract JWT dynamically with Playwright
def fetch_dynamic_jwt(url):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)  # Headless mode enabled
        page = browser.new_page()

        # Apply stealth mode (helps evade bot detection)
        stealth_sync(page)

        # Simulate a real user request
        page.set_extra_http_headers({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Referer": "https://tvmi.mt/"
        })

        # Navigate to the page with increased timeout and reliable loading trigger
        try:
            print(f"Navigating to {url}...")
            page.goto(url, timeout=60000, wait_until="domcontentloaded")  # 60 sec timeout

            content = page.content()
            browser.close()

            # Extract values dynamically
            data_jwt_value = re.search(r'data-jwt="(.*?)"', content)
            host_value = re.search(r'data-dist-host="(.*?)"', content)

            return data_jwt_value.group(1) if data_jwt_value else None, host_value.group(1) if host_value else None
        except Exception as e:
            print(f"Error while loading {url}: {e}")
            browser.close()
            return None, None

# Process each URL
for url, name in zip(urls, names):
    try:
        print(f"Processing URL: {url}")
        data_jwt, host = fetch_dynamic_jwt(url)

        if not data_jwt or not host:
            print(f"Error: Missing values for {url}, skipping...")
            continue

        live_url = f"https://{host}/{data_jwt}/live/{url.split('/')[-1]}/0/index.m3u8"
        output_file = os.path.join(output_dir, f"{name}.m3u8")

        # Save output
        with open(output_file, "w") as file:
            file.write("#EXTM3U\n")
            file.write("#EXT-X-VERSION:3\n")
            file.write('#EXT-X-STREAM-INF:BANDWIDTH=1755600,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"\n')
            file.write(f"{live_url}|Referer=https://tvmi.mt/\n")

        print(f"Generated {output_file} successfully!")

    except Exception as e:
        print(f"Error processing {url}: {e}")
