import requests

# Define the API URL
url = "https://api.myvideo.ge/api/v1/channel/chunk/pirvelitv"

# Send the GET request
response = requests.get(url)

if response.status_code == 200:
    try:
        # Parse JSON response
        json_data = response.json()
        file_url = json_data.get("data", {}).get("attributes", {}).get("file")

        if file_url:
            # Extract base URL from file URL
            base_url = file_url.rsplit("/", 1)[0] + "/"

            # Fetch m3u8 content
            content_response = requests.get(file_url)
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

                print(modified_content)
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
