import requests
import base64
import re

USER_AGENT = "Dalvik/2.1.0 (Linux; U; Android 8.0.1;)"
REFERRER = "https://peers.tv/"
EXTOPT = "$OPT:adaptive-logic=highest$OPT:demux=adaptive,any$OPT:adaptive-use-access" \
         f"$OPT:http-user-agent={USER_AGENT}$OPT:http-referrer={REFERRER}" \
         "$OPT:no-ts-cc-check$OPT:INT-SCRIPT-PARAMS=peers_tv"

def decode_url(encoded_url):
    """Decode a Base64-encoded URL"""
    return base64.b64decode(encoded_url).decode()

def get_token():
    """Fetch authentication token from PeersTV API"""
    url = decode_url("aHR0cDovL2FwaS5wZWVycy50di9hdXRoLzIvdG9rZW4=")
    payload = decode_url("Z3JhbnRfdHlwZT1pbmV0cmElM0Fhbm9ueW1vdXMmY2xpZW50X2lkPTI5NzgzMDUxJmNsaWVudF9zZWNyZXQ9YjRkNGViNDM4ZDc2MGRhOTVmMGFjYjViYzZiNWM3NjA")
    
    headers = {"User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded"}
    response = requests.post(url, data=payload, headers=headers, timeout=8)
    
    if response.status_code != 200:
        return None
    
    return re.search(r'"access_token":"([^"]+)"', response.text).group(1)

def get_archive_url(channel_id, token):
    """Retrieve archive stream URL from PeersTV API"""
    url = decode_url("aHR0cHM6Ly9hcGkucGVlcnMudHYvbWVkaWFsb2NhdG9yLzEvdGltZXNoaWZ0Lmpzb24/b2Zmc2V0PTcyMDAmc3RyZWFtX2lkPQ") + channel_id
    headers = {"User-Agent": USER_AGENT, "Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers, timeout=12)
    
    if response.status_code != 200:
        return None
    
    stream_url = re.search(r'"uri":"([^"]+)"', response.text)
    
    if not stream_url:
        return None
    
    return stream_url.group(1).replace('\\/', '/') + EXTOPT

def get_stream_url(base_url, token):
    """Format stream URL with token and options"""
    stream_url = f"{base_url}?token={token}"
    stream_url = re.sub(r"([\?&]offset=\d+)", r"\1", stream_url)
    stream_url = re.sub(r"[\?&]+", "&", stream_url)
    stream_url = re.sub(r"&", "?", stream_url, 1)
    
    return stream_url + EXTOPT

if __name__ == "__main__":
    tv_id = "futbol_hd"  # Default channel ID
    
    token = get_token()
    if not token:
        print("Error fetching token.")
        exit()

    archive_url = get_archive_url(tv_id, token)
    if archive_url:
        print(f"Archive stream URL: {archive_url}")
    else:
        print("No archive stream available.")

    base_stream_url = f"http://hls.peers.tv/streaming/{tv_id}/playlist.m3u8"
    stream_url = get_stream_url(base_stream_url, token)
    print(f"Live stream URL: {stream_url}")
