import requests
import os

# Directory to save output files
output_dir = "links"
os.makedirs(output_dir, exist_ok=True)

# API URL
url = "https://api.myvideo.ge/api/v1/channel/chunk/pirvelitv"

# Define headers, including referrer and origin
headers = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "ge",
    "authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjYwMTFkY2ZmYzFhNzM0NWE5YjU4Y2QwZmE1NTZhZjE5OTcyOTU3ODUzOTUyZDc0OWZkNTI2MmFlZWZiOWI5OGI1NDc1NTAyZWMzYThmYzhhIn0.eyJhdWQiOiI3IiwianRpIjoiNjAxMWRjZmZjMWE3MzQ1YTliNThjZDBmYTU1NmFmMTk5NzI5NTc4NTM5NTJkNzQ5ZmQ1MjYyYWVlZmI5Yjk4YjU0NzU1MDJlYzNhOGZjOGEiLCJpYXQiOjE3NDY1NDcwOTgsIm5iZiI6MTc0NjU0NzA5OCwiZXhwIjoxNzQ2NjMzNDk4LCJzdWIiOiIiLCJzY29wZXMiOltdfQ.kcwSi_5_jxcs2p75pZ0lUjurhKpngKiF01jmStKkmqvusXAjvR8JsZfp199DcyfEqpeP7i6PO2xyBecxijSALtViVxEdomWjbXMikme6ogro0aoCIXDsg3jrLoSCqoOH1u1jGSsjqEboQpsHaBYtB9AM2qO1hw-uerD0mmcZsGv8XGkovh8mHUJWZRiqOqYie2t85ZVvbSpq4DtoZhjTvhE6A9Cm1HKqOMBc5XgNsbT-OzcVLi8sngmn94gxJ0JODsc9AiyKytyQPss-pexqkTi7PTjkMhEzkXsINkih5cGoEBMFsQrFnPflWxkB_3XdS3cQc2F2xEX2GgOwEoEcg50y8NudVE2SSajTfNadr41VjJm4rXyjTYPtIMridPJeYWSsOjVeztuJCHf1xXSjOjHH1ACngjFGMr6x0ec5XG0gJaZc_ESwiuhKsAbsp0DZVifnRnYV2KJ5R3LmXxA3D_7mvJIKqS4N6TEcXq_Nhzd1_LS-vyq4ZMpgT7wZpBsbeaCdmMMOlfQuXvUghvnwFz5efNJHFjKtS8eAacZJlmfCGbV1LAyNtci3xPwcXvPkb7QEDEm5hxnoi1dVXR2TMpuXmiNdupJoWAWA1w2JcGLM0e5s-yJ-qz2YlXsBVT0MoK883Suf2KZIPiMFWgT_K56T7du3SFc_6LqcPe7KVRo",
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

try:
    # Send request to API
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    response_json = response.json()
    
    # Extract file URL
    file_url = response_json.get("data", {}).get("attributes", {}).get("file")

    if file_url:
        # Define resolution variations
        variations = {
            "master_v1": (6020000, 4810000, "1920x1080"),
            "master_v2": (2710000, 2170000, "1280x720"),
            "master_v3": (2160000, 1730000, "1024x576"),
        }

        output_file = os.path.join(output_dir, "stream_links.m3u8")

        with open(output_file, "w") as file:
            file.write("#EXTM3U\n")
            file.write("#EXT-X-VERSION:4\n")
            file.write("#EXT-X-INDEPENDENT-SEGMENTS\n")

            for variant, (bandwidth, avg_bandwidth, resolution) in variations.items():
                modified_link = file_url.replace("index", variant)
                file.write(f'#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},AVERAGE-BANDWIDTH={avg_bandwidth},CODECS="avc1.4d0028,mp4a.40.2",RESOLUTION={resolution},FRAME-RATE=25.000,AUDIO="program_audio_0"\n')
                file.write(f"{modified_link}\n")

        print(f"Created file: {output_file}")
    else:
        print("File URL not found in the response.")

except requests.exceptions.RequestException as e:
    print(f"Error fetching data from {url}: {e}")
except (KeyError, IndexError):
    print("Error: Unable to retrieve the file URL from the response.")
