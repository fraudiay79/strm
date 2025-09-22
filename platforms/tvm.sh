#!/bin/bash

# Cookie file
cookie_file="cookies.txt"

# Function to extract attribute value from HTML
extract_attribute() {
    local html="$1"
    local attribute="$2"
    
    # Use grep with Perl-style regex to properly extract the attribute value
    echo "$html" | grep -oP "$attribute=\"\K[^\"]*" | head -1
}

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
    
    # Extract attributes using robust parsing
    local jwt_token
    jwt_token=$(extract_attribute "$html_content" "data-jwt")
    
    local dist_host
    dist_host=$(extract_attribute "$html_content" "data-dist-host")
    
    local dist_host_alt
    dist_host_alt=$(extract_attribute "$html_content" "data-dist-host-alt1")
    
    local src_rel
    src_rel=$(extract_attribute "$html_content" "data-src-rel")
    
    echo "Extracted data for $channel_name:"
    if [ -n "$jwt_token" ]; then
        echo "  JWT: ${jwt_token:0:60}... (length: ${#jwt_token})"
    else
        echo "  JWT: NOT FOUND"
    fi
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
    
    if [ "${#jwt}" -lt 100 ]; then  # Reduced minimum length requirement
        echo "  Validation failed: JWT token too short (${#jwt} chars), expected at least 100"
        return 1
    fi
    
    if [ -z "$dist_host" ]; then
        echo "  Validation failed: Distribution host is empty"
        return 1
    fi
    
    echo "  Validation passed: JWT=${#jwt} chars, Host=$dist_host"
    return 0
}

# Alternative parsing method if the first one fails
alternative_parse() {
    local channel_name="$1"
    local html_file="debug_${channel_name}.html"
    
    if [ ! -f "$html_file" ]; then
        echo ""
        return
    fi
    
    echo "Trying alternative parsing method for $channel_name..."
    
    # Try to find the video tag and extract attributes from it
    local video_tag
    video_tag=$(grep -o '<video[^>]*>' "$html_file" | head -1)
    
    if [ -n "$video_tag" ]; then
        echo "Found video tag: ${video_tag:0:100}..."
        
        # Extract attributes from the video tag
        local jwt_token
        jwt_token=$(echo "$video_tag" | grep -o 'data-jwt="[^"]*"' | sed 's/data-jwt="//' | sed 's/"//')
        
        local dist_host
        dist_host=$(echo "$video_tag" | grep -o 'data-dist-host="[^"]*"' | sed 's/data-dist-host="//' | sed 's/"//')
        
        local src_rel
        src_rel=$(echo "$video_tag" | grep -o 'data-src-rel="[^"]*"' | sed 's/data-src-rel="//' | sed 's/"//')
        
        echo "Alternative parse results:"
        echo "  JWT: ${jwt_token:0:60}... (length: ${#jwt_token})"
        echo "  Dist Host: $dist_host"
        echo "  Source Relative: $src_rel"
        
        echo "${jwt_token},${dist_host},,${src_rel}"
    else
        echo ""
    fi
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

# If first method failed, try alternative parsing
if [ "${#jwt_tvm}" -lt 100 ]; then
    echo "First parsing method failed for TVM, trying alternative..."
    tvm_data_alt=$(alternative_parse "tvm")
    if [ -n "$tvm_data_alt" ]; then
        IFS=',' read -r jwt_tvm dist_host_tvm dummy src_rel_tvm <<< "$tvm_data_alt"
    fi
fi

if [ "${#jwt_tvmnews}" -lt 100 ]; then
    echo "First parsing method failed for TVM News, trying alternative..."
    tvmnews_data_alt=$(alternative_parse "tvmnews")
    if [ -n "$tvmnews_data_alt" ]; then
        IFS=',' read -r jwt_tvmnews dist_host_tvmnews dummy src_rel_tvmnews <<< "$tvmnews_data_alt"
    fi
fi

if [ "${#jwt_tvmsport}" -lt 100 ]; then
    echo "First parsing method failed for TVM Sport, trying alternative..."
    tvmsport_data_alt=$(alternative_parse "tvmsport")
    if [ -n "$tvmsport_data_alt" ]; then
        IFS=',' read -r jwt_tvmsport dist_host_tvmsport dummy src_rel_tvmsport <<< "$tvmsport_data_alt"
    fi
fi

# Update the m3u8 files with the correct host and token
update_count=0

echo ""
echo "Updating M3U8 files..."

if validate_data "$jwt_tvm" "$dist_host_tvm"; then
    # Use the main distribution host
    final_dist_host_tvm="$dist_host_tvm"
    
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
rm -f links/mt/*.bak

# Report results
echo ""
if [ "$update_count" -eq 3 ]; then
    echo "✅ All M3U8 files updated successfully with dynamic hosts"
    rm -f debug_*.html
elif [ "$update_count" -gt 0 ]; then
    echo "⚠️  $update_count/3 M3U8 files updated"
    echo "Debug files preserved for inspection: debug_*.html"
else
    echo "❌ Failed to update any M3U8 files"
    echo ""
    echo "Debugging info:"
    echo "Check the debug_*.html files to see what was fetched from the website"
    echo "The HTML structure might be different than expected."
    exit 1
fi

exit 0
