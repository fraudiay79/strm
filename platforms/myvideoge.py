import requests
import os
import json

# Directory to save output files
output_dir = "links/ge"
os.makedirs(output_dir, exist_ok=True)

# List of URLs and corresponding names
urls = [
    "https://api.myvideo.ge/api/v1/channel/chunk/pirvelitv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/mtavari",    
    "https://api.myvideo.ge/api/v1/channel/chunk/rustavi2hqnew",    
    "https://api.myvideo.ge/api/v1/channel/chunk/euronewsgeorgia",    
    "https://api.myvideo.ge/api/v1/channel/chunk/imedihd",    
    "https://api.myvideo.ge/api/v1/channel/chunk/postv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/formula",    
    "https://api.myvideo.ge/api/v1/channel/chunk/formula-new",    
    "https://api.myvideo.ge/api/v1/channel/chunk/caucasia",    
    "https://api.myvideo.ge/api/v1/channel/chunk/palitra",    
    "https://api.myvideo.ge/api/v1/channel/chunk/maestro",    
    "https://api.myvideo.ge/api/v1/channel/chunk/comedy",    
    "https://api.myvideo.ge/api/v1/channel/chunk/marao",    
    "https://api.myvideo.ge/api/v1/channel/chunk/rtv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/starvision",    
    "https://api.myvideo.ge/api/v1/channel/chunk/artarea",    
    "https://api.myvideo.ge/api/v1/channel/chunk/caucasia",    
    "https://api.myvideo.ge/api/v1/channel/chunk/erimedia",    
    "https://api.myvideo.ge/api/v1/channel/chunk/abkhaz",    
    "https://api.myvideo.ge/api/v1/channel/chunk/agrogaremo",    
    "https://api.myvideo.ge/api/v1/channel/chunk/agrotv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/bolneli",    
    "https://api.myvideo.ge/api/v1/channel/chunk/drotv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/kartuliarkhi",    
    "https://api.myvideo.ge/api/v1/channel/chunk/bbb",    
    "https://api.myvideo.ge/api/v1/channel/chunk/enkibenki",    
    "https://api.myvideo.ge/api/v1/channel/chunk/ertsulovneba",    
    "https://api.myvideo.ge/api/v1/channel/chunk/qartuli",    
    "https://api.myvideo.ge/api/v1/channel/chunk/puls",    
    "https://api.myvideo.ge/api/v1/channel/chunk/musictv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/malltv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/obiektivi",    
    "https://api.myvideo.ge/api/v1/channel/chunk/trialeti",    
    "https://api.myvideo.ge/api/v1/channel/chunk/sferotv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/tv24",    
    "https://api.myvideo.ge/api/v1/channel/chunk/tvzari",    
    "https://api.myvideo.ge/api/v1/channel/chunk/rioni",    
    "https://api.myvideo.ge/api/v1/channel/chunk/sdasutv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/diatv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/lilotv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/marneulitv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/megatv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/tv25",    
    "https://api.myvideo.ge/api/v1/channel/chunk/imervizia",    
    "https://api.myvideo.ge/api/v1/channel/chunk/gurjaani",    
    "https://api.myvideo.ge/api/v1/channel/chunk/qvemoqartli",    
    "https://api.myvideo.ge/api/v1/channel/chunk/tvmax",    
    "https://api.myvideo.ge/api/v1/channel/chunk/shonitv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/pktv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/batumitv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/guriatv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/tv12",    
    "https://api.myvideo.ge/api/v1/channel/chunk/stereoplus",    
    "https://api.myvideo.ge/api/v1/channel/chunk/tvmze",    
    "https://api.myvideo.ge/api/v1/channel/chunk/toktv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/parvanatv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/positivetv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/meteo24",    
    "https://api.myvideo.ge/api/v1/channel/chunk/tvsaperavi",    
    "https://api.myvideo.ge/api/v1/channel/chunk/gms",    
    "https://api.myvideo.ge/api/v1/channel/chunk/chadrakitv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/girchitv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/o2",    
    "https://api.myvideo.ge/api/v1/channel/chunk/egrisitv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/argotv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/gmtv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/kolkheti89",    
    "https://api.myvideo.ge/api/v1/channel/chunk/greentv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/borjomitv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/odishi",    
    "https://api.myvideo.ge/api/v1/channel/chunk/nwbctv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/tv9",    
    "https://api.myvideo.ge/api/v1/channel/chunk/tanamgzavri",    
    "https://api.myvideo.ge/api/v1/channel/chunk/tafutv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/tv5geo",    
    "https://api.myvideo.ge/api/v1/channel/chunk/gttv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/akhalitv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/tvmonitoring",    
    "https://api.myvideo.ge/api/v1/channel/chunk/ctv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/sezonitv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/bmg",    
    "https://api.myvideo.ge/api/v1/channel/chunk/primetv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/plustv",    
    "https://api.myvideo.ge/api/v1/channel/chunk/tvtvc"
]

# Corresponding names for the output files
names = [
    "pirvelitv", "mtavari", "rustavi2hqnew", "euronewsgeorgia", "imedihd", "postv", "formula",
    "formula-new", "caucasia", "palitra", "maestro", "comedy", "marao", "rtv", "starvision",
    "artarea", "caucasia", "erimedia", "abkhaz", "agrogaremo", "agrotv", "bolneli", "drotv",
    "kartuliarkhi", "bbb", "enkibenki", "ertsulovneba", "qartuli", "puls", "musictv", "malltv",
    "obiektivi", "trialeti", "sferotv", "tv24", "tvzari", "rioni", "sdasutv", "diatv", "lilotv",
    "marneulitv", "megatv", "tv25", "imervizia", "gurjaani", "qvemoqartli", "tvmax", "shonitv",
    "pktv", "batumitv", "guriatv", "tv12", "stereoplus", "tvmze", "toktv", "parvanatv",
    "positivetv", "meteo24", "tvsaperavi", "gms", "chadrakitv", "girchitv", "o2", "egrisitv",
    "argotv", "gmtv", "kolkheti89", "greentv", "borjomitv", "odishi", "nwbctv", "tv9",
    "tanamgzavri", "tafutv", "tv5geo", "gttv", "akhalitv", "tvmonitoring", "ctv",
    "sezonitv", "bmg", "primetv", "plustv", "tvtvc"
]

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
    base_url = f"http://nue01-edge03.itdc.ge/{name}/"  # Ensure correct format

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()

        # Parse JSON response safely
        try:
            json_data = response.json()
        except json.JSONDecodeError:
            print(f"Error: Invalid JSON response for {name}.")
            continue

        file_url = json_data.get("data", {}).get("attributes", {}).get("file")

        if not file_url:
            print(f"Error: 'file' key missing for {name}.")
            continue

        # Fetch m3u8 content using headers
        content_response = requests.get(file_url, headers=headers)
        content_response.raise_for_status()

        content = content_response.text
        lines = content.split("\n")
        modified_content = ""

        for line in lines:
            line = line.strip()
            if not line:  # Skip empty lines
                continue
            if not line.startswith("#") and not line.startswith("http"):
                full_url = base_url + line
                modified_content += full_url + "\n"
            else:
                modified_content += line + "\n"

        # Save the modified content to a file
        output_file = os.path.join(output_dir, f"{name}.m3u8")
        with open(output_file, "w") as file:
            file.write(modified_content)

        print(f"Created file: {output_file}")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data for {name}: {e}")
