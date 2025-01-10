import urllib.request, json, codecs, os

output_dir = 'itvuz'
os.makedirs(output_dir, exist_ok=True)

# Fetch ITV channels
data = {}
with urllib.request.urlopen("https://api.itv.uz/v2/cards/channels/list") as url:
    data = json.loads(url.read().decode())

channels = data['data']

m3u = '#EXTM3U\n'

for channel in channels:
    if channel['params']['isFree'] == "false":
        continue
    poster_url = channel['files']['posterUrl']
    title = channel['channelTitle']
    # poster_path = 'covers/' + title + poster_url[-4:]
    
    # urllib.request.urlretrieve(f'https://files.itv.uz/{poster_url}', poster_path)

    channel_data = {}
    with urllib.request.urlopen(f"https://api.itv.uz/v2/cards/channels/show?channelId={channel['channelId']}") as url:
        channel_data = json.loads(url.read().decode())

    m3u += f'#EXTINF:-1 tvg-logo="{poster_url}", {title}\n'
    m3u += channel_data['data']['files']['streamUrl'] + '\n'

with codecs.open("tv.m3u", "w", "utf-8") as file:
    file.write(m3u)
