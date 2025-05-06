import requests
import os

# Directory to save output files
output_dir = "links/ge"
os.makedirs(output_dir, exist_ok=True)

# List of URLs and corresponding names
urls = [
    "https://api.myvideo.ge/api/v1/channel/chunk/pirvelitv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/mtavari"
]
names = ["pirvelitv", "mtavari"]

# Define headers, including referrer and origin
headers = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "ge",
    "authorization": "Bearer YOUR_ACCESS_TOKEN",  # Replace with a valid token
    "priority": "u=1, i",
    "sec-ch-ua": "\"Chromium\";v=\"136\", \"Google Chrome\";v=\"136\", \"Not.A/Brand\";v=\"99\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "referer": "https://tv.myvideo.ge/",
    "origin": "https://tv.myvideo.ge"
}

# Loop through each URL and corresponding name
for url, name in zip(urls, names):
    base_url = f"http://nue01-edge03.itdc.ge/{name}/"  # Correctly format base URL

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        try:
            json_data = response.json()
            file_url = json_data.get("data", {}).get("attributes", {}).get("file")

            if file_url:
                # Fetch m3u8 content using headers
                content_response = requests.get(file_url, headers=headers)
                if content_response.status_code == 200:
                    content = content_response.text
                    lines = content.split("\n")
                    modified_content = ""

                    for line in lines:
                        line = line.strip()
                        if line and not line.startswith("#") and not line.startswith("http"):
                            full_url = base_url + line
                            modified_content += full_url + "\n"
                        else:
                            modified_content += line + "\n"

                    # Save the modified content to a file
                    output_file = os.path.join(output_dir, f"{name}.m3u8")
                    with open(output_file, "w") as file:
                        file.write(modified_content)

                    print(f"Created file: {output_file}")

                else:
                    print(f"Failed to fetch m3u8 content for {name}.")
            else:
                print(f"File URL not found for {name}.")

        except requests.exceptions.RequestException as e:
            print(f"Error fetching data for {name}: {e}")
        except ValueError:
            print(f"Error: Invalid JSON response for {name}.")
    else:
        print(f"Failed to fetch API content for {name}. Status code:", response.status_code)
