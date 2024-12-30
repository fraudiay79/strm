import urllib.request
import json
import os

# Create the 'mediabay' directory if it doesn't exist
output_dir = 'mediabay'
os.makedirs(output_dir, exist_ok=True)

import urllib.request
import json

def fetch_m3u8_url():
    api_url = "https://api.mediabay.tv/v2/channels/thread/90"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Cookie': '_ga=GA1.1.1151399358.1734108649; _fbp=fb.1.1734108648923.42978377352479572; _ym_uid=1692727402762493332; _ym_d=1734108650; _ga_PDV69TQ9S4=GS1.1.1735576265.5.0.1735576265.60.0.0; SERVERID=app5; PHPSESSID=udb3fqmmv3gmu624rkj5aqnons; _ym_isad=1',
        'Connection': 'keep-alive',
        'Host': 'api.mediabay.tv',
        'Sec-Ch-Ua': '"Not.A/Brand";v="24", "Chromium";v="131", "Google Chrome";v="131"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-site',
        'Sec-Fetch-User': '?1'
    }

    try:
        # Create a request with headers
        req = urllib.request.Request(api_url, headers=headers)

        # Fetch data from the API
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())

        # Extract the m3u8 URL from the JSON response
        m3u8_url = data.get('data', [])[0].get('threadAddress', '')
        print(f"m3u8 URL: {m3u8_url}")

    except Exception as e:
        print(f"An error occurred: {e}")

# Call the function
fetch_m3u8_url()
