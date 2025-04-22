#! /usr/bin/python3

import requests
import json

print('#EXTM3U')
print('#EXT-X-VERSION:4')
print('#EXT-X-INDEPENDENT-SEGMENTS')
print('#EXT-X-STREAM-INF:BANDWIDTH=10243200,AVERAGE-BANDWIDTH=6811200,CODECS="avc1.64002a,mp4a.40.2",RESOLUTION=1920x1080,FRAME-RATE=50.000,AUDIO="program_audio_0"')

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'
}
s = requests.Session()
resplink = s.get('https://vod.tvp.pl/api/products/399702/videos/playlist?videoType=LIVE&lang=PL&platform=BROWSER')
response_json = json.loads(resplink.text)
mastlnk = response_json["sources"]["HLS"][0]["src"]
new_string = mastlnk.replace("master", "master_v1")
print(new_string)
print('#EXT-X-STREAM-INF:BANDWIDTH=4056800,AVERAGE-BANDWIDTH=2741200,CODECS="avc1.640020,mp4a.40.2",RESOLUTION=1024x576,FRAME-RATE=50.000,AUDIO="program_audio_0"')
new2_string = mastlnk.replace("master", "master_v2")
print(new2_string)
print('#EXT-X-STREAM-INF:BANDWIDTH=1047200,AVERAGE-BANDWIDTH=761200,CODECS="avc1.64001e,mp4a.40.2",RESOLUTION=512x288,FRAME-RATE=50.000,AUDIO="program_audio_0"')
new3_string = mastlnk.replace("master", "master_v3")
print(new3_string)
new4_string = mastlnk.replace("master", "master_a1")
print('#EXT-X-MEDIA:TYPE=AUDIO,LANGUAGE="pol",NAME="Polski",AUTOSELECT=YES,DEFAULT=YES,CHANNELS="2",GROUP-ID="program_audio_0",URI="{}"'.format(new4_string), end='')
