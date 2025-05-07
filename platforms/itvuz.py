import requests
import os
import json

# Directory to save output files
output_dir = "links/uz"
os.makedirs(output_dir, exist_ok=True)

# List of URLs and corresponding names
urls = [
    "https://api.itv.uz/v2/cards/channels/show?channelId=1",
	"https://api.itv.uz/v2/cards/channels/show?channelId=3",
	"https://api.itv.uz/v2/cards/channels/show?channelId=4",
	"https://api.itv.uz/v2/cards/channels/show?channelId=5",
	"https://api.itv.uz/v2/cards/channels/show?channelId=10",
	"https://api.itv.uz/v2/cards/channels/show?channelId=12",
	"https://api.itv.uz/v2/cards/channels/show?channelId=256",
	"https://api.itv.uz/v2/cards/channels/show?channelId=143",
	"https://api.itv.uz/v2/cards/channels/show?channelId=16",
	"https://api.itv.uz/v2/cards/channels/show?channelId=144",
	"https://api.itv.uz/v2/cards/channels/show?channelId=14",
	"https://api.itv.uz/v2/cards/channels/show?channelId=89",
	"https://api.itv.uz/v2/cards/channels/show?channelId=145",
	"https://api.itv.uz/v2/cards/channels/show?channelId=8",
	"https://api.itv.uz/v2/cards/channels/show?channelId=142",
	"https://api.itv.uz/v2/cards/channels/show?channelId=9",
	"https://api.itv.uz/v2/cards/channels/show?channelId=6",
	"https://api.itv.uz/v2/cards/channels/show?channelId=7",
	"https://api.itv.uz/v2/cards/channels/show?channelId=11",
	"https://api.itv.uz/v2/cards/channels/show?channelId=81",
	"https://api.itv.uz/v2/cards/channels/show?channelId=17",
	"https://api.itv.uz/v2/cards/channels/show?channelId=25",
	"https://api.itv.uz/v2/cards/channels/show?channelId=77",
	"https://api.itv.uz/v2/cards/channels/show?channelId=137",
	"https://api.itv.uz/v2/cards/channels/show?channelId=147",
	"https://api.itv.uz/v2/cards/channels/show?channelId=245",
	"https://api.itv.uz/v2/cards/channels/show?channelId=250",
	"https://api.itv.uz/v2/cards/channels/show?channelId=257",
	"https://api.itv.uz/v2/cards/channels/show?channelId=258",
	"https://api.itv.uz/v2/cards/channels/show?channelId=259",
	"https://api.itv.uz/v2/cards/channels/show?channelId=272",
	"https://api.itv.uz/v2/cards/channels/show?channelId=277",
	"https://api.itv.uz/v2/cards/channels/show?channelId=276",
	"https://api.itv.uz/v2/cards/channels/show?channelId=266",
	"https://api.itv.uz/v2/cards/channels/show?channelId=267",
	"https://api.itv.uz/v2/cards/channels/show?channelId=268",
	"https://api.itv.uz/v2/cards/channels/show?channelId=269",
	"https://api.itv.uz/v2/cards/channels/show?channelId=270",
	"https://api.itv.uz/v2/cards/channels/show?channelId=271",
	"https://api.itv.uz/v2/cards/channels/show?channelId=273",
	"https://api.itv.uz/v2/cards/channels/show?channelId=275",
	"https://api.itv.uz/v2/cards/channels/show?channelId=263",
	"https://api.itv.uz/v2/cards/channels/show?channelId=287",
	"https://api.itv.uz/v2/cards/channels/show?channelId=290"
]

# Corresponding names for the output files
names = [
    "ozbekiston", "yoshlar", "toshkent", "sportuz", "futboltv", "ozbekiston24", "zortv", "itvcinema", "milliy",
    "itvmusic", "my5", "renessans", "dasturxon", "bolajon", "aqlvoy", "navo",
    "madaniyat", "mahalla", "kinoteatr", "ozbekistontarixi", "dunyoboylab", "uzreport", "taraqqiyot",
    "ruxsor", "nurafshon", "ferganamtrk", "xorazmmtrk", "vodiy", "shifo", "mimitv", "ttv",
    "ttvkino", "ttvmusiqa", "jizzax", "ishonch", "ellikqala", "8tv", "amudaryo",
    "nasaf", "jaslar", "muloqot", "livetv", "makontv", "denov"
]

# Define headers, including referrer and origin
headers = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "sec-ch-ua": "\"Chromium\";v=\"136\", \"Google Chrome\";v=\"136\", \"Not.A/Brand\";v=\"99\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "referer": "https://itv.uz/",
    "origin": "https://itv.uz"
}

# Loop through each URL and corresponding name
for url, name in zip(urls, names):
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()

        # Parse JSON response safely
        try:
            json_data = response.json()
        except json.JSONDecodeError:
            print(f"Error: Invalid JSON response for {name}.")
            continue

        file_url = json_data.get("data", {}).get("files", {}).get("streamUrl")

        if not file_url:
            print(f"Error: 'streamUrl' key missing for {name}.")
            continue

        # Extract base URL from streamUrl
        base_url = file_url.rsplit("/", 1)[0] + "/"

        # Fetch m3u8 content using headers
        content_response = requests.get(file_url, headers=headers)
        content_response.raise_for_status()

        content = content_response.text
        lines = content.split("\n")
        #modified_content = "#EXTM3U\n"

        for line in lines:
            line = line.strip()
            if not line:  # Skip empty lines
                continue
            if line.startswith("#"):
                modified_content += line + "\n"
            elif line.startswith("tracks-"):  # Ensure full URL for track listings
                modified_content += base_url + line + "\n"

        # Save the modified content to a file
        output_file = os.path.join(output_dir, f"{name}.m3u8")
        with open(output_file, "w") as file:
            file.write(modified_content)

        print(f"Created file: {output_file}")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data for {name}: {e}")
