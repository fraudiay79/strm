#!/bin/bash

# Cookie file
cookie_file="cookies.txt"

# Function to fetch and parse data for a channel
fetch_channel_data() {
    local channel_id=$1
    local channel_name=$2
    
    echo "Fetching data for $channel_name (channel $channel_id)..."
    
    # First, get the main page to establish session
    curl -s -L -c "$cookie_file" -b "$cookie_file" \
         -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
         "https://tvmi.mt/" > /dev/null
    
    # Now fetch the channel page with proper headers
    local html_content
    html_content=$(curl -s -L \
                      -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
                      -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8" \
                      -H "Accept-Language: en-US,en;q=0.9" \
                      -H "Accept-Encoding: gzip, deflate, br" \
                      -H "DNT: 1" \
                      -H "Connection: keep-alive" \
                      -H "Upgrade-Insecure-Requests: 1" \
                      -H "Sec-Fetch-Dest: document" \
                      -H "Sec-Fetch-Mode: navigate" \
                      -H "Sec-Fetch-Site: same-origin" \
                      -H "Cache-Control: max-age=0" \
                      -H "Referer: https://tvmi.mt/" \
                      -c "$cookie_file" \
                      -b "$cookie_file" \
                      "https://tvmi.mt/live/$channel_id")
    
    # Save for debugging
    echo "$html_content" > "debug_${channel_name}.html"
    
    # Check if we got meaningful content
    if [ -z "$html_content" ] || [ ${#html_content} -lt 1000 ]; then
        echo "  ERROR: Insufficient HTML content received (length: ${#html_content})"
        return 1
    fi
    
    echo "  HTML content length: ${#html_content}"
    
    # Try to find the video tag - be more flexible with the search
    local video_tag
    video_tag=$(echo "$html_content" | grep -i '<video' | head -1)
    
    if [ -z "$video_tag" ]; then
        echo "  WARNING: Could not find video tag directly, searching for data-jwt attribute..."
        # Look for data-jwt attribute anywhere in the HTML
        video_tag=$(echo "$html_content" | grep -i 'data-jwt=' | head -1)
    fi
    
    if [ -z "$video_tag" ]; then
        echo "  ERROR: Could not find video tag or data-jwt attribute"
        echo "  First 500 chars of HTML:"
        echo "${html_content:0:500}"
        return 1
    fi
    
    echo "  Found tag: ${video_tag:0:150}..."
    
    # Extract attributes using more robust methods
    local jwt_token
    jwt_token=$(echo "$video_tag" | sed -n 's/.*data-jwt="\([^"]*\)".*/\1/p')
    
    local dist_host
    dist_host=$(echo "$video_tag" | sed -n 's/.*data-dist-host="\([^"]*\)".*/\1/p')
    
    local dist_host_alt
    dist_host_alt=$(echo "$video_tag" | sed -n 's/.*data-dist-host-alt1="\([^"]*\)".*/\1/p')
    
    local src_rel
    src_rel=$(echo "$video_tag" | sed -n 's/.*data-src-rel="\([^"]*\)".*/\1/p')
    
    echo "  Results:"
    echo "    JWT length: ${#jwt_token}"
    if [ ${#jwt_token} -gt 20 ]; then
        echo "    JWT sample: ${jwt_token:0:30}..."
    fi
    echo "    Dist Host: $dist_host"
    echo "    Alt Dist Host: $dist_host_alt"
    echo "    Source Relative: $src_rel"
    
    # Return values as global variables
    eval "${channel_name}_jwt=\"$jwt_token\""
    eval "${channel_name}_dist_host=\"$dist_host\""
    eval "${channel_name}_dist_host_alt=\"$dist_host_alt\""
    eval "${channel_name}_src_rel=\"$src_rel\""
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
echo "=== TVM ==="
fetch_channel_data "2" "tvm"
jwt_tvm="$tvm_jwt"
dist_host_tvm="$tvm_dist_host"
dist_host_alt_tvm="$tvm_dist_host_alt"
src_rel_tvm="$tvm_src_rel"

echo ""
echo "=== TVM News ==="
fetch_channel_data "3" "tvmnews"
jwt_tvmnews="$tvmnews_jwt"
dist_host_tvmnews="$tvmnews_dist_host"
dist_host_alt_tvmnews="$tvmnews_dist_host_alt"
src_rel_tvmnews="$tvmnews_src_rel"

echo ""
echo "=== TVM Sport ==="
fetch_channel_data "4" "tvmsport"
jwt_tvmsport="$tvmsport_jwt"
dist_host_tvmsport="$tvmsport_dist_host"
dist_host_alt_tvmsport="$tvmsport_dist_host_alt"
src_rel_tvmsport="$tvmsport_src_rel"

echo ""
echo "=== Summary ==="
echo "TVM JWT length: ${#jwt_tvm}, Host: $dist_host_tvm"
echo "TVM News JWT length: ${#jwt_tvmnews}, Host: $dist_host_tvmnews"
echo "TVM Sport JWT length: ${#jwt_tvmsport}, Host: $dist_host_tvmsport"
echo ""

# Update the m3u8 files
update_count=0

echo "Updating M3U8 files..."

update_m3u8() {
    local channel_name="$1"
    local jwt_token="$2"
    local dist_host="$3"
    local dist_host_alt="$4"
    local src_rel="$5"
    local channel_id="$6"
    local file_path="links/mt/${channel_name}.m3u8"
    
    if [ -n "$jwt_token" ] && [ ${#jwt_token} -gt 100 ] && [ -n "$dist_host" ]; then
        # Use main host or fallback to alternative
        local final_dist_host="$dist_host"
        if [ -z "$final_dist_host" ] && [ -n "$dist_host_alt" ]; then
            final_dist_host="$dist_host_alt"
            echo "  Using alternative distribution host: $final_dist_host"
        fi
        
        # Use extracted source path or default
        local final_src_rel="$src_rel"
        if [ -z "$final_src_rel" ]; then
            final_src_rel="/master.m3u8"
        fi
        
        cat > "$file_path" << EOF
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=1755600,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"
https://${final_dist_host}/${jwt_token}/live/${channel_id}${final_src_rel}
EOF
        
        echo "✓ Updated $channel_name - JWT length: ${#jwt_token}, Host: $final_dist_host"
        return 0
    else
        echo "✗ Failed to get valid data for $channel_name (JWT length: ${#jwt_token}, Host: $dist_host)"
        cp "${file_path}.bak" "$file_path" 2>/dev/null || true
        return 1
    fi
}

if update_m3u8 "tvm" "$jwt_tvm" "$dist_host_tvm" "$dist_host_alt_tvm" "$src_rel_tvm" "2"; then
    update_count=$((update_count + 1))
fi

if update_m3u8 "tvmnews" "$jwt_tvmnews" "$dist_host_tvmnews" "$dist_host_alt_tvmnews" "$src_rel_tvmnews" "3"; then
    update_count=$((update_count + 1))
fi

if update_m3u8 "tvmsport" "$jwt_tvmsport" "$dist_host_tvmsport" "$dist_host_alt_tvmsport" "$src_rel_tvmsport" "4"; then
    update_count=$((update_count + 1))
fi

# Cleanup
rm -f "$cookie_file"
rm -f links/mt/*.bak

# Report results
echo ""
if [ $update_count -eq 3 ]; then
    echo "✅ All M3U8 files updated successfully!"
elif [ $update_count -gt 0 ]; then
    echo "⚠️  $update_count/3 M3U8 files updated"
else
    echo "❌ Failed to update any M3U8 files"
    echo ""
    echo "The video tag might not be in the HTML or the structure is different."
    echo "Please check if curl is receiving the correct HTML content."
    exit 1
fi

exit 0
