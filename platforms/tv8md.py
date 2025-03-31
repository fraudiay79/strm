import requests
import os

# API URL to fetch the liveUrl
api_url = "https://api.tv8.md/v1/live"
m3u_file = "md.m3u"  # Replace with the actual .m3u file path
target_header = '#EXTINF:-1 tvg-id="TV8.md" tvg-name="TV8" tvg-logo="https://raw.githubusercontent.com/fraudiay79/logos/master/md/tv8.png" group-title="🇲🇩 Moldova | Moldova",TV8'

def fetch_live_url(api_url):
    try:
        # Fetch data from the API
        response = requests.get(api_url)
        response.raise_for_status()
        data = response.json()
        
        # Extract liveUrl
        live_url = data.get("liveUrl")
        if not live_url:
            print("Error: liveUrl not found in the API response.")
            return None
        return live_url
    except requests.exceptions.RequestException as e:
        print(f"An error occurred while fetching liveUrl: {e}")
        return None

def update_m3u_file(m3u_file, target_header, new_url):
    try:
        # Check if the .m3u file exists
        if not os.path.exists(m3u_file):
            print(f"Error: {m3u_file} does not exist.")
            return
        
        # Read the existing m3u file
        with open(m3u_file, "r") as file:
            lines = file.readlines()
        
        # Modify the URL under the target header
        updated_lines = []
        found = False
        for i, line in enumerate(lines):
            updated_lines.append(line)
            if line.strip() == target_header:
                # Update the next line (URL)
                if i + 1 < len(lines):  # Ensure the URL line exists
                    updated_lines[-1] = target_header + "\n"  # Re-add the header line
                    updated_lines.append(new_url + "\n")  # Overwrite URL
                    found = True
        
        # Write the updated lines back to the file
        if found:
            with open(m3u_file, "w") as file:
                file.writelines(updated_lines)
            print(f"Updated the URL under '{target_header}' in {m3u_file}.")
        else:
            print(f"Header '{target_header}' not found in the file.")
    except Exception as e:
        print(f"An error occurred while updating the m3u file: {e}")

def main():
    live_url = fetch_live_url(api_url)
    if live_url:
        update_m3u_file(m3u_file, target_header, live_url)

if __name__ == "__main__":
    main()
