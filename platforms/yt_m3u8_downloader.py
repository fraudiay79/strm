import json
import subprocess

with open("yttest.json", "r", encoding="utf-8") as f:
    channels = json.load(f)

for channel in channels:
    name = channel.get("name")
    url = channel.get("url")

    print(f"⏳ Processing: {name} - {url}")

    try:
        result = subprocess.run(
            ["yt-dlp", "-g", "-f", "best", url],
            capture_output=True,
            text=True,
            check=True
        )
        m3u8_url = result.stdout.strip()
        if m3u8_url.startswith("http"):
            with open(f"{name}.m3u8", "w", encoding="utf-8") as f_out:
                f_out.write(m3u8_url + "\n")
            print(f"✅ Saved: {name}.m3u8")
        else:
            print(f"⚠️ Invalid output: {name}")

    except subprocess.CalledProcessError as e:
        print(f"❌ An error occurred ({name}): {e.stderr.strip()}")
