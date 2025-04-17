import requests
import re
import json

base_url = "https://live.cdn.tv8.md/TV7/"
url = "https://api.tv8.md/v1/live"

s = requests.Session()
resplink = s.get(url)
response_json = json.loads(resplink.text)
mastlnk = response_json["liveUrl"]

content_response = requests.get(mastlnk)
content = content_response.text

lines = content.split("\n")
modified_content = ""
for line in lines:
    if line.startswith("TV7"):
        full_url = base_url + line
        modified_content += full_url + "\n"
    else:
        full_url = base_url + line
        modified_content += full_url + "\n"

print(modified_content)
