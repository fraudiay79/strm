import requests
import json
import base64

FILTER = [
    ("8 Канал Красноярский край- RU", "8 канал (Красноярск)"),
    ("РТР - ПЛАНЕТА - RU - TEST", "РТР-Планета (Азия)"),
    ("Первый - RU - TEST", "Первый канал (Азия)"),
    ("Russia Today Documentary - RU", "RTД"),
    ("Russia Today - RU", "Russia Today"),
    ("CBC (Caspian Broadcasting Company) - AZ", "CBC"),
    ("Россия 24 - RU - TEST", "Россия 24"),
    ("8 ТВ Москва - RU", "8 канал"),
    ("Афонтово", "Афонтово (Красноярск)"),
    ("Дагестан", "Дагестан (Махачкала)"),
    ("Звезда - RU", "Звезда"),
    ("Ингушетия", "Ингушетия (Магас)"),
    ("Краснодар", "Краснодар он-лайн (Краснодар)"),
    ("Мир 24 - RU", "Мир 24"),
]

def process_filter_table(channels):
    """Rename channels according to filter"""
    for channel in channels:
        channel["name"] = " ".join(channel["name"].split())  # Remove extra spaces
        for old_name, new_name in FILTER:
            if channel["name"] == old_name:
                channel["name"] = new_name
    return channels

def load_from_site():
    """Fetch channel list from mediabay.tv"""
    url = "http://api.mediabay.tv/v2/channels/channels"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"}
    response = requests.get(url, headers=headers, timeout=8)
    
    if response.status_code != 200:
        return None
    
    data = json.loads(response.text).get("data", [])
    channels = [{"name": item["name"].replace(" (тест)", ""),
                 "logo": f'https://media.mediabay.tv{item["logo"]}',
                 "address": f'http://mediabay.tv/tv/{item["id"]}'} for item in data]
    
    return process_filter_table(channels)

def write_m3u(channels, m3u_file):
    """Save channel list to an M3U file"""
    with open(m3u_file, "w", encoding="utf-8") as f:
        for channel in channels:
            f.write(f'#EXTINF:-1,{channel["name"]}\n{channel["address"]}\n')

if __name__ == "__main__":
    m3u_file = "mediabay.m3u"
    channels = load_from_site()
    
    if channels:
        write_m3u(channels, m3u_file)
        print(f'Playlist saved to {m3u_file}')
    else:
        print("Error loading playlist")
