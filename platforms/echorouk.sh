#!/bin/bash

# URLs and corresponding data
urls=(
    "https://live.dzsecurity.net/live/player/echorouktv"
    "https://live.dzsecurity.net/live/player/echorouknews" 
    "https://live.dzsecurity.net/live/player/ennahartv"
    "https://live.dzsecurity.net/live/player/elhayattv"
)
names=("echorouktv" "echorouknews" "ennahartv" "elhayattv")
referers=(
    "https://www.echoroukonline.com/"
    "https://www.echoroukonline.com/"
    "https://www.ennaharonline.com/"
    "https://elhayat.dz/"
)

# Common headers
user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

# Directory to save output files
output_dir="links/dz"
mkdir -p "$output_dir"

# Function to process each channel
process_channel() {
    local index=$1
    local url="${urls[$index]}"
    local name="${names[$index]}"
    local referer="${referers[$index]}"
    
    echo "Processing $name..."
    
    # Create temporary file for response
    local temp_file=$(mktemp)
    
    # Fetch the page with curl
    if curl -s -L -A "$user_agent" -H "Referer: $referer" "$url" -o "$temp_file" --write-out "%{http_code}" > /dev/null 2>&1; then
        
        # Look for m3u8 URL patterns
        local m3u8_url=$(grep -oP 'src:\s*location\.protocol\s*\+\s*["'"'"']([^"'"'"']+\.m3u8\?[^"'"'"']+)["'"'"']' "$temp_file" | head -1 | sed -E 's|src:\s*location\.protocol\s*\+\s*["'"'"']([^"'"'"']+)["'"'"']|\1|')
        
        # If first pattern didn't match, try alternative pattern
        if [ -z "$m3u8_url" ]; then
            m3u8_url=$(grep -oP '["'"'"'](//[^"'"'"']+\.m3u8\?[^"'"'"']+)["'"'"']' "$temp_file" | head -1 | sed -E 's/["'"'"'](.*)["'"'"']/\1/')
        fi
        
        if [ -n "$m3u8_url" ]; then
            # Ensure URL starts with https:
            if [[ ! "$m3u8_url" =~ ^https?:// ]]; then
                m3u8_url="https:$m3u8_url"
            fi
            
            echo "Found m3u8 URL: $m3u8_url"
            
            # Create the m3u8 playlist content
            local m3u8_content="#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=992257,RESOLUTION=1920x1080,CODECS=\"avc1.4d402a,mp4a.40.2\"
$m3u8_url"
            
            # Save as .m3u8 file
            local output_file="$output_dir/${name}.m3u8"
            echo "$m3u8_content" > "$output_file"
            echo "Saved m3u8 playlist to: $output_file"
        else
            echo "No m3u8 URL found in the page."
        fi
    else
        echo "Failed to retrieve the page."
    fi
    
    # Clean up temporary file
    rm -f "$temp_file"
    
    echo "--------------------------------------------------"
}

# Process all channels
for i in "${!urls[@]}"; do
    process_channel "$i"
done

echo "All channels processed!"
