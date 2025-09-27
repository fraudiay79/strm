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
    http_code=$(curl -s -L -A "$user_agent" -H "Referer: $referer" "$url" -o "$temp_file" -w "%{http_code}")
    
    if [ "$http_code" -eq 200 ]; then
        # Look for http://hls-distrib- patterns with token parameter
        local m3u8_url=$(grep -oP 'http://hls-distrib-[^"'\'']+\.m3u8\?e=[0-9]+&token=[^"'\''&]+' "$temp_file" | head -1)
        
        # If not found, look for protocol-relative URLs
        if [ -z "$m3u8_url" ]; then
            m3u8_url=$(grep -oP '//hls-distrib-[^"'\'']+\.m3u8\?e=[0-9]+&token=[^"'\''&]+' "$temp_file" | head -1)
            if [ -n "$m3u8_url" ]; then
                m3u8_url="http:$m3u8_url"
            fi
        fi
        
        if [ -n "$m3u8_url" ]; then
            echo "Found m3u8 URL: $m3u8_url"
            
            # Create the m3u8 playlist content
            local m3u8_content="#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=1823614,RESOLUTION=1280x720,CODECS=\"avc1.640029,mp4a.40.2\"
$m3u8_url"
            
            # Save as .m3u8 file
            local output_file="$output_dir/${name}.m3u8"
            echo "$m3u8_content" > "$output_file"
            echo "Saved m3u8 playlist to: $output_file"
        else
            echo "No m3u8 URL found in the page."
        fi
    else
        echo "Failed to retrieve the page. Status code: $http_code"
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
