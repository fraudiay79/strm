import requests
import re
import os

# Directory to save output files
output_dir = "links/ru"
os.makedirs(output_dir, exist_ok=True)

USER_AGENT = "Dalvik/2.1.0 (Linux; U; Android 8.0.1;)"
REFERRER = "https://peers.tv/"
EXTOPT = "#EXTVLCOPT:adaptive-logic=highest\n#EXTVLCOPT:demux=adaptive,any\n#EXTVLCOPT:adaptive-use-access\n" \
         f"#EXTVLCOPT:http-user-agent={USER_AGENT}\n#EXTVLCOPT:http-referrer={REFERRER}\n" \
         "#EXTVLCOPT:no-ts-cc-check\n#EXTVLCOPT:INT-SCRIPT-PARAMS=peers_tv"

def get_token():
    """Fetch authentication token from PeersTV API"""
    url = "http://api.peers.tv/auth/2/token"
    payload = "grant_type=inetra%3Aanonymous&client_id=29783051&client_secret=b4d4eb438d760da95f0acb5bc6b5c760"
    
    headers = {"User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded"}
    response = requests.post(url, data=payload, headers=headers, timeout=8)
    
    if response.status_code != 200:
        return None
    
    return re.search(r'"access_token":"([^"]+)"', response.text).group(1)

def get_archive_url(channel_id, token):
    """Retrieve archive stream URL from PeersTV API"""
    url = f"https://api.peers.tv/medialocator/1/timeshift.json?offset=7200&stream_id={channel_id}&offset=1"
    headers = {"User-Agent": USER_AGENT, "Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers, timeout=12)
    
    if response.status_code != 200:
        return None
    
    stream_url = re.search(r'"uri":"([^"]+)"', response.text)
    
    if not stream_url:
        return None
    
    return stream_url.group(1).replace('\\/', '/') 

def get_stream_url(base_url, token):
    """Format stream URL with token and options"""
    stream_url = f"{base_url}?token={token}&offset=10"
    stream_url = re.sub(r"([\?&]offset=\d+)", r"\1", stream_url)
    stream_url = re.sub(r"[\?&]+", "&", stream_url)
    stream_url = re.sub(r"&", "?", stream_url, 1)
    
    return stream_url 

def save_m3u8(filename, stream_url):
    """Save stream URL in .m3u8 format"""
    filepath = os.path.join(output_dir, filename)
    with open(filepath, "w", encoding="utf-8") as file:
        file.write("#EXTM3U\n")
        file.write("#EXT-X-VERSION:3\n")
        file.write("#EXT-X-STREAM-INF:PROGRAM-ID=1\n")
        #file.write(f"{EXTOPT}\n")
        file.write(f"{stream_url}\n")
    print(f"Saved M3U8 file: {filepath}")

# List of TV channel IDs
tv_id = [
    "firstmuz", "2x2tv", "8_kanal", "amedia1", "amediapremium_hd", "babes_tv", "blue_hustler_18", "brazzers_tv_europe_18", "ipark",
    "da_vinci", "erox_18", "fan_hd", "filmbox_arthouse", "kino24", "mma_tv_com", "rutv",
    "russia_today_hd", "sonyscifi", "sony_turbo", "set", "tiji", "timeless_dizi_channel", "travel_adventure_hd",
    "tv21", "tv1000_action", "tv_1000_rus_kino", "viasat_explorer", "viasat_nature", "viasat_sport_hd", "tv1000_comedy_hd", "tv1000_megahit_hd",
    "tv1000_premium_hd", "viasat_golf_hd", "zee-tv", "zoopark", "avto_24", "auto_plus", "v_gostyah_u_skazki",
    "time", "detskij_mir", "dialogi_o_rybalke", "dom_kino", "dom_kino_premium", "dorama", "drive", "jv", "eurokino", "zoo_tv", "khl", "kxl_hd", "boets",
    "match_nash_sport", "otvrus", "ots", "1kanal_hd", "friday", "5kanal", "rentv", "ren_tv_hd", "sts_love", "futbol_hd", "perec", "shalun",
    "exxxotica_hd", "russkayanoch", "playboy_tv_18", "red_lips_hd", "karusel", "mama", "muz_tvnew", "tv3", "tnt_hd", "utv", "nts","mir_basketbola"
]

# Corresponding names for the output files
names = [
    "1hd", "2x2", "8kanal", "amedia1", "amediapremium", "bab", "bhus", "bratv", "ipark",
    "davinci", "ero", "fan", "filmboxarthouse", "kino24", "mmatv", "rutv",
    "rt", "scifi", "black", "red", "tiji", "dizi", "traveladventure",
    "tv21", "tv1000action", "tv1000ruskino", "vijuexplorer", "vijunature", "vijusport", "vijucomedy", "vijumegahit",
    "vijupremiere", "vijuserial", "indiya", "zoopark", "avto24", "autoplus", "vgostyahuskazki",
    "vremya", "detskijmir", "dialogiorybalke", "domkino", "domkinopremium", "dorama", "drive", "jv", "eurokino", "zootv", "khl", "khlprime", "boets",
    "strana", "otvrus", "ots", "1kanal", "friday", "5kanal", "rentv", "rentvhd", "stslove", "futbol", "che", "shalun", "otica", "russnoch", "pbtv", "redl", "karusel",
    "mama", "muztv", "tv3", "tnt", "utv", "nts", "mirbasketbola"
]

# Mapping TV channel IDs to corresponding file names
channel_map = dict(zip(tv_id, names))

if __name__ == "__main__":
    token = get_token()
    if not token:
        print("Error fetching token.")
        exit()

    print("#EXTM3U")
    print("#EXT-X-VERSION:3")

    for channel, filename in channel_map.items():
        if channel == "babes_tv" or channel == "nts" or channel == "otvrus":
            base_stream_url = f"http://api.peers.tv/timeshift/{channel}/126/playlist.m3u8"
        else:
            base_stream_url = f"http://api.peers.tv/timeshift/{channel}/16/playlist.m3u8"

        stream_url = get_stream_url(base_stream_url, token)

        print("#EXT-X-STREAM-INF:PROGRAM-ID=1")
        print(EXTOPT)
        print(stream_url)

        save_m3u8(f"{filename}.m3u8", stream_url)
