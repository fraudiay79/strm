import requests
import os

# Directory to save output files
output_dir = "links"
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
    "authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjYwMTFkY2ZmYzFhNzM0NWE5YjU4Y2QwZmE1NTZhZjE5OTcyOTU3ODUzOTUyZDc0OWZkNTI2MmFlZWZiOWI5OGI1NDc1NTAyZWMzYThmYzhhIn0.eyJhdWQiOiI3IiwianRpIjoiNjAxMWRjZmZjMWE3MzQ1YTliNThjZDBmYTU1NmFmMTk5NzI5NTc4NTM5NTJkNzQ5ZmQ1MjYyYWVlZmI5Yjk4YjU0NzU1MDJlYzNhOGZjOGEiLCJpYXQiOjE3NDY1NDcwOTgsIm5iZiI6MTc0NjU0NzA5OCwiZXhwIjoxNzQ2NjMzNDk4LCJzdWIiOiIiLCJzY29wZXMiOltdfQ.kcwSi_5_jxcs2p75pZ0lUjurhKpngKiF01jmStKkmqvusXAjvR8JsZfp199DcyfEqpeP7i6PO2xyBecxijSALtViVxEdomWjbXMikme6ogro0aoCIXDsg3jrLoSCqoOH1u1jGSsjqEboQpsHaBYtB9AM2qO1hw-uerD0mmcZsGv8XGkovh8mHUJWZRiqOqYie2t85ZVvbSpq4DtoZhjTvhE6A9Cm1HKqOMBc5XgNsbT-OzcVLi8sngmn94gxJ0JODsc9AiyKytyQPss-pexqkTi7PTjkMhEzkXsINkih5cGoEBMFsQrFnPflWxkB_3XdS3cQc2F2xEX2GgOwEoEcg50y8NudVE2SSajTfNadr41VjJm4rXyjTYPtIMridPJeYWSsOjVeztuJCHf1xXSjOjHH1ACngjFGMr6x0ec5XG0gJaZc_ESwiuhKsAbsp0DZVifnRnYV2KJ5R3LmXxA3D_7mvJIKqS4N6TEcXq_Nhzd1_LS-vyq4ZMpgT7wZpBsbeaCdmMMOlfQuXvUghvnwFz5efNJHFjKtS8eAacZJlmfCGbV1LAyNtci3xPwcXvPkb7QEDEm5hxnoi1dVXR2TMpuXmiNdupJoWAWA1w2JcGLM0e5s-yJ-qz2YlXsBVT0MoK883Suf2KZIPiMFWgT_K56T7du3SFc_6LqcPe7KVRo",  # Replace with a valid token
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
