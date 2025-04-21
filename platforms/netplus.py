import requests


print("*** NET+/SWEEZ TV M3U CREATOR ***\n")

# LOAD EPG DATA
epg_api = "https://www.netplus.tv/api/cache/epglive/"
epg = requests.get(epg_api).json()

# CHECK CHANNELS
ch_list = []
ok = 0
nok = 0

for i in epg.keys():
    
    # MAIN
    t = requests.get(f"https://cachehsi1a.netplus.ch/live/eds/{i}/browser-dash/{i}.mpd")
    s = t.status_code
    
    if int(s) == 200:
        print(f"[ OK  ] {i}")
        ch_list.append({"id": i, "type": "mpd"})
        ok = ok + 1
    else:
        # RETRY
        t = requests.get(f"https://ntg-netplus-content.netgemplatform.net/api/channels?id={i.replace('fast_', '')}&contentType=hls")
        s = t.status_code

        if int(s) == 200:
            print(f"[ OK2 ] {i}")
            ch_list.append({"id": i, "type": "hls"})
            ok = ok + 1
        else:
            print(f"[ERROR] {i}")
            nok = nok + 1

print(f"\nSCAN RESULT: {ok} OK / {nok} NOT FOUND")

# CREATE FILE
with open("tv.m3u", "w+") as file:
    file.write("#EXTM3U\n")
    for i in ch_list:
        file.write("#KODIPROP:inputstreamclass=inputstream.adaptive\n")
        file.write(f"#KODIPROP:inputstream.adaptive.manifest_type={i['type']}\n")
        file.write(f'#EXTINF:0001 tvg-id="{i["id"]}" tvg-logo="https://picserve.netplus.ch/channels/{i["id"]}.png", {i["id"].replace("fast_", "")}\n')
        if i["type"] == "mpd":
            file.write(f"https://cachehsi1a.netplus.ch/live/eds/{i['id']}/browser-dash/{i['id']}.mpd\n")
        elif i["type"] == "hls":
            file.write(f"https://ntg-netplus-content.netgemplatform.net/api/channels?id={i['id'].replace('fast_', '')}&contentType=hls\n")

print("\n*** M3U FILE CREATED! ***\n")
