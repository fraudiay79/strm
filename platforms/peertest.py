import requests

FILTER = {
    '360': '360 Подмосковье (Москва)'
}

MY_SRC_NAME = 'PeersTV'

def process_filter_table_local(channels):
    if not isinstance(channels, list):
        return
    for channel in channels:
        channel['name'] = channel['name'].replace('  ', ' ')
        if channel['name'] in FILTER:
            channel['name'] = FILTER[channel['name']]
    return channels

def get_settings():
    return {
        "name": MY_SRC_NAME,
        "sortname": "",
        "scraper": "",
        "m3u": f"out_{MY_SRC_NAME}.m3u",
        "logo": "../Channel/logo/Icons/peerstv.png",
        "TypeSource": 1,
        "TypeCoding": 1,
        "DeleteM3U": 1,
        "RefreshButton": 1,
        "show_progress": 0,
        "AutoBuild": 0,
        "AutoBuildDay": [0] * 7,
        "LastStart": 0,
        "TVS": {"add": 1, "FilterCH": 1, "FilterGR": 1, "GetGroup": 1, "LogoTVG": 1},
        "STV": {"add": 1, "ExtFilter": 1, "FilterCH": 1, "FilterGR": 1, "GetGroup": 1, "HDGroup": 1,
                "AutoSearch": 1, "AutoNumber": 1, "NumberM3U": 0, "GetSettings": 0, "NotDeleteCH": 0,
                "TypeSkip": 1, "TypeFind": 1, "TypeMedia": 0, "RemoveDupCH": 1}
    }

def get_version():
    return 2, "UTF-8"

def trim(s):
    return s.strip()

def load_from_site():
    session = requests.Session()
    session.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:101.0) Gecko/20100101 Firefox/101.0"})
    
    auth_body = "grant_type=inetra&anonymous&client_id=29783051&client_secret=b4d4eb438d760da95f0acb5bc6b5c760"
    auth_url = "http://api.peers.tv/auth/2/token"

    response = session.post(auth_url, data=auth_body)
    token = response.json().get("access_token", "")

    playlist_url = "http://api.peers.tv/iptv/2/playlist.m3u"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = session.get(playlist_url, headers=headers)
    session.close()
    
    if response.status_code != 200:
        return
    
    channels = []
    for match in response.text.split("STREAM-INF"):
        details = match.split("\n")
        if len(details) >= 2:
            name, address = details[0], details[1]
            if name and address and "/data/tv/" not in address:
                channels.append({"name": name.replace("[0+]", ""), "address": address})
    
    return process_filter_table_local(channels)

def get_list(update_id, m3u_file):
    if not update_id or not m3u_file:
        return
    
    channels = load_from_site()
    if not channels:
        return
    
    with open(m3u_file, "w+") as f:
        f.write("\n".join([f"{channel['name']} - {channel['address']}" for channel in channels]))
    
    return "ok"
