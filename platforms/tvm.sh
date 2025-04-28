#!/bin/bash

# File paths
file1="platforms/links/tvm.m3u8"
file2="platforms/links/tvmnews.m3u8"
file3="platforms/links/tvmsport.m3u8"

# URLs to fetch `data-jwt`
url1="https://tvmi.mt/live/2"
url2="https://tvmi.mt/live/3"
url3="https://tvmi.mt/live/4"

# Corresponding live paths
live1="/live/2/0/index.m3u8"
live2="/live/3/0/index.m3u8"
live3="/live/4/0/index.m3u8"

# Map files and URLs for iteration
declare -A filesAndUrls=(
  ["$file1"]="$url1:$live1"
  ["$file2"]="$url2:$live2"
  ["$file3"]="$url3:$live3"
)

# Iterate through files and URLs
for file in "${!filesAndUrls[@]}"; do
  # Parse URL and live path
  IFS=":" read -r url livePath <<< "${filesAndUrls[$file]}"
  
  # Fetch the data-jwt and update the file
  sed -i "/https:\/\/dist9.tvmi.mt/ c https://dist9.tvmi.mt/$(wget -qO- "$url" | grep -oP 'data-jwt="\K[^"]+')${livePath}" "$file"
done

exit 0
