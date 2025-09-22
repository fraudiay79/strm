#!/bin/bash

# Cookie file
cookie_file="cookies.txt"

# Function to fetch fresh cookies, JWT token, and distribution host for a specific channel
fetch_channel_data() {
    local channel_id=$1
    local channel_name=$2
    
    echo "Fetching data for $channel_name (channel $channel_id)..."
    
    # Use curl to handle cookies automatically and get the HTML content
    local html_content
    html_content=$(curl -s -L \
                      -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" \
                      -H "accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7" \
                      -H "accept-language: en-US,en;q=0.9" \
                      -H "sec-ch-ua: \"Google Chrome\";v=\"140\", \"Not-A.Brand\";v=\"24\", \"Chromium\";v=\"140\"" \
                      -H "sec-ch-ua-mobile: ?0" \
                      -H "sec-ch-ua-platform: \"Windows\"" \
                      -H "sec-fetch-dest: document" \
                      -H "sec-fetch-mode: navigate" \
                      -H "sec-fetch-site: same-origin" \
                      -H "upgrade-insecure-requests: 1" \
                      -c "$cookie_file" \
                      -b "$cookie_file" \
                      "https://tvmi.mt/live/$channel_id")
    
    # Debug: Save HTML content for inspection
    echo "$html_content" > "debug_${channel_name}.html"
    
    # Extract JWT token - look for data-jwt attribute in video tag
    local jwt_token
    jwt_token=$(echo "$html_content" | grep -o 'data-jwt="[^"]*"' | head -1 | sed 's/data-jwt="//' | sed 's/"//')
    
    # Extract distribution host
    local dist_host
    dist_host=$(echo "$html_content" | grep -o 'data-dist-host="[^"]*"' | head -1 | sed 's/data-dist-host="//' | sed 's/"//')
    
    # Extract alternative distribution host (fallback)
    local dist_host_alt
    dist_host_alt=$(echo "$html_content" | grep -o 'data-dist-host-alt1="[^"]*"' | head -1 | sed 's/data-dist-host-alt1="//' | sed 's/"//')
    
    # Extract source relative path
    local src_rel
    src_rel=$(echo "$html_content" | grep -o 'data-src-rel="[^"]*"' | head -1 | sed 's/data-src-rel="//' | sed 's/"//')
    
    echo "Extracted data for $channel_name:"
    echo "  JWT: ${jwt_token:0:50}..."  # Show first 50 chars only
    echo "  Dist Host: $dist_host"
    echo "  Alt Dist Host: $dist_host_alt"
    echo "  Source Relative: $src_rel"
    
    # Return data as comma-separated values
    echo "${jwt_token},${dist_host},${dist_host_alt},${src_rel}"
}

# Function to check if we have valid data
validate_data() {
    local jwt="$1"
    local dist_host="$2"
    
    if [ -z "$jwt" ]; then
        echo "  Validation failed: JWT token is empty"
        return 1
    fi
    
    if [ "${#jwt}" -lt 50 ]; then
        echo "  Validation failed: JWT token too short (${#jwt} chars)"
        return 1
    fi
    
    if [ -z "$dist_host" ]; then
        echo "  Validation failed: Distribution host is empty"
        return 1
    fi
    
    echo "  Validation passed: JWT=${#jwt} chars, Host=$dist_host"
    return 0
}

# Main script execution
echo "Fetching channel data..."

# Ensure links directory exists
mkdir -p links/mt

# Create backup of existing files
cp links/mt/tvm.m3u8 links/mt/tvm.m3u8.bak 2>/dev/null || true
cp links/mt/tvmnews.m3u8 links/mt/tvmnews.m3u8.bak 2>/dev/null || true
cp links/mt/tvmsport.m3u8 links/mt/tvmsport.m3u8.bak 2>/dev/null || true

# Fetch data for each channel
tvm_data=$(fetch_channel_data "2" "tvm")
tvmnews_data=$(fetch_channel_data "3" "tvmnews") 
tvmsport_data=$(fetch_channel_data "4" "tvmsport")

# Parse the data for each channel
IFS=',' read -r jwt_tvm dist_host_tvm dist_host_alt_tvm src_rel_tvm <<< "$tvm_data"
IFS=',' read -r jwt_tvmnews dist_host_tvmnews dist_host_alt_tvmnews src_rel_tvmnews <<< "$tvmnews_data"
IFS=',' read -r jwt_tvmsport dist_host_tvmsport dist_host_alt_tvmsport src_rel_tvmsport <<< "$tvmsport_data"

# Update the m3u8 files with the correct host and token
update_count=0

echo ""
echo "Updating M3U8 files..."

if validate_data "$jwt_tvm" "$dist_host_tvm"; then
    # Use the main distribution host, fallback to alternative if needed
    final_dist_host_tvm="$dist_host_tvm"
    if [ -z "$final_dist_host_tvm" ] && [ -n "$dist_host_alt_tvm" ]; then
        final_dist_host_tvm="$dist_host_alt_tvm"
        echo "  Using alternative distribution host for TVM: $final_dist_host_tvm"
    fi
    
    # Use the extracted source relative path or default to /master.m3u8
    if [ -z "$src_rel_tvm" ]; then
        final_src_rel_tvm="/master.m3u8"
    else
        final_src_rel_tvm="$src_rel_tvm"
    fi
    
    # Create or update the m3u8 file
    cat > links/mt/tvm.m3u8 << EOF
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=1755600,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"
https://${final_dist_host_tvm}/${jwt_tvm}/live/2${final_src_rel_tvm}
EOF
    
    echo "✓ Updated TVM - Host: $final_dist_host_tvm, Path: $final_src_rel_tvm"
    update_count=$((update_count + 1))
else
    echo "✗ Failed to get valid data for TVM"
    # Restore backup
    cp links/mt/tvm.m3u8.bak links/mt/tvm.m3u8 2>/dev/null || true
fi

if validate_data "$jwt_tvmnews" "$dist_host_tvmnews"; then
    final_dist_host_tvmnews="$dist_host_tvmnews"
    if [ -z "$final_dist_host_tvmnews" ] && [ -n "$dist_host_alt_tvmnews" ]; then
        final_dist_host_tvmnews="$dist_host_alt_tvmnews"
        echo "  Using alternative distribution host for TVM News: $final_dist_host_tvmnews"
    fi
    
    if [ -z "$src_rel_tvmnews" ]; then
        final_src_rel_tvmnews="/master.m3u8"
    else
        final_src_rel_tvmnews="$src_rel_tvmnews"
    fi
    
    cat > links/mt/tvmnews.m3u8 << EOF
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=1755600,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"
https://${final_dist_host_tvmnews}/${jwt_tvmnews}/live/3${final_src_rel_tvmnews}
EOF
    
    echo "✓ Updated TVM News - Host: $final_dist_host_tvmnews, Path: $final_src_rel_tvmnews"
    update_count=$((update_count + 1))
else
    echo "✗ Failed to get valid data for TVM News"
    cp links/mt/tvmnews.m3u8.bak links/mt/tvmnews.m3u8 2>/dev/null || true
fi

if validate_data "$jwt_tvmsport" "$dist_host_tvmsport"; then
    final_dist_host_tvmsport="$dist_host_tvmsport"
    if [ -z "$final_dist_host_tvmsport" ] && [ -n "$dist_host_alt_tvmsport" ]; then
        final_dist_host_tvmsport="$dist_host_alt_tvmsport"
        echo "  Using alternative distribution host for TVM Sport: $final_dist_host_tvmsport"
    fi
    
    if [ -z "$src_rel_tvmsport" ]; then
        final_src_rel_tvmsport="/master.m3u8"
    else
        final_src_rel_tvmsport="$src_rel_tvmsport"
    fi
    
    cat > links/mt/tvmsport.m3u8 << EOF
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=1755600,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"
https://${final_dist_host_tvmsport}/${jwt_tvmsport}/live/4${final_src_rel_tvmsport}
EOF
    
    echo "✓ Updated TVM Sport - Host: $final_dist_host_tvmsport, Path: $final_src_rel_tvmsport"
    update_count=$((update_count + 1))
else
    echo "✗ Failed to get valid data for TVM Sport"
    cp links/mt/tvmsport.m3u8.bak links/mt/tvmsport.m3u8 2>/dev/null || true
fi

# Cleanup
rm -f "$cookie_file"
rm -f debug_*.html
rm -f links/mt/*.bak

# Report results
echo ""
if [ "$update_count" -eq 3 ]; then
    echo "✅ All M3U8 files updated successfully with dynamic hosts"
elif [ "$update_count" -gt 0 ]; then
    echo "⚠️  $update_count/3 M3U8 files updated"
else
    echo "❌ Failed to update any M3U8 files"
    echo ""
    echo "Debugging info:"
    echo "Check the debug_*.html files to see what was fetched from the website"
    exit 1
fi

exit 0
