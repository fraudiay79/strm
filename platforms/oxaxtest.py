import requests
import re

# Channel name filter
filter_map = {
    "Setanta Sports Plus": "Setanta Sports+"
}

def process_filter_table_local(channels):
    """Apply name filters to the channel list."""
    for channel in channels:
        if channel["name"] in filter_map:
            channel["name"] = filter_map[channel["name"]]
    return channels

def load_from_site():
    """Fetch TV channel list from oxax.tv."""
    url = "http://oxax.tv/vz_spi.php"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 Chrome/75.0.2785.143 Safari/537.36"}
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print("Failed to retrieve channels.")
        return []

    channels = []
    for match in re.findall(r'href="(.*?)".*?title="(.*?)"', response.text):
        address, name = match
        name = name.replace(" смотреть онлайн", "")  # Remove extra text
        channels.append({"name": name, "address": f"http://oxax.tv{address}"})

    return process_filter_table_local(channels)

def generate_m3u(channels, output_file="out_oxax.m3u"):
    """Generate M3U playlist from the fetched channel list."""
    with open(output_file, "w", encoding="utf-8") as f:
        for channel in channels:
            f.write(f'#EXTINF:-1,{channel["name"]}\n{channel["address"]}\n')

    print(f"Playlist saved to {output_file}")

if __name__ == "__main__":
    channels = load_from_site()
    if channels:
        generate_m3u(channels)
