import requests
import os

# Directory to save output files
output_dir = "links"
os.makedirs(output_dir, exist_ok=True)

# Define API URL
url = "https://api.myvideo.ge/api/v1/channel/chunk/pirvelitv"

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

# Base URL for constructing full paths
base_url = "http://nue01-edge03.itdc.ge/pirvelitv/"

# Send GET request to API
response = requests.get(url, headers=headers)

if response.status_code == 200:
    try:
        # Parse JSON response
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
                    if line.startswith("live_"):  # Replace relative paths with full URLs
                        full_url = base_url + line
                        modified_content += full_url + "\n"
                    else:
                        modified_content += line + "\n"

                # Save the modified content to a file
                output_file = os.path.join(output_dir, "stream_links.m3u8")
                with open(output_file, "w") as file:
                    file.write(modified_content)

                print(f"Created file: {output_file}")

            else:
                print("Failed to fetch m3u8 content.")
        else:
            print("File URL not found in the response.")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
    except ValueError:
        print("Error: Invalid JSON response.")
else:
    print("Failed to fetch API content. Status code:", response.status_code)
