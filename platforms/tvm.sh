#!/bin/bash

# Cookie file
cookie_file="cookies.txt"

# Function to fetch fresh cookies, JWT token, and distribution host for a specific channel
fetch_channel_data() {
    local channel_id=$1
    local channel_name=$2
    
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
    
    # Extract JWT token
    local jwt_token
    jwt_token=$(echo "$html_content" | grep -oE 'data-jwt="[^"]+"' | sed -n 's/.*data-jwt="\([^"]*\)".*/\1/p')
    
    # Extract distribution host
    local dist_host
    dist_host=$(echo "$html_content" | grep -oE 'data-dist-host="[^"]+"' | sed -n 's/.*data-dist-host="\([^"]*\)".*/\1/p')
    
    # Extract alternative distribution host (fallback)
    local dist_host_alt
    dist_host_alt=$(echo "$html_content" | grep -oE 'data-dist-host-alt1="[^"]+"' | sed -n 's/.*data-dist-host-alt1="\([^"]*\)".*/\1/p')
    
    # Extract source relative path
    local src_rel
    src_rel=$(echo "$html_content" | grep -oE 'data-src-rel="[^"]+"' | sed -n 's/.*data-src-rel="\([^"]*\)".*/\1/p')
    
    echo "Data for $channel_name (channel $channel_id):"
    echo "  JWT: $jwt_token"
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
    if [ -z "$jwt" ] || [ "${#jwt}" -lt 50 ] || [ -z "$dist_host" ]; then
        return 1  # Invalid data
    fi
    return 0  # Valid data
}

# Main script execution
echo "Fetching channel data..."

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
    
    sed -i "s|https://[^/]*\.tvmi\.mt/[^/]*/live/2/0/index\.m3u8|https://${final_dist_host_tvm}/${jwt_tvm}/live/2${final_src_rel_tvm}|g" links/mt/tvm.m3u8
    echo "✓ Updated TVM - Host: $final_dist_host_tvm, Path: $final_src_rel_tvm"
    update_count=$((update_count + 1))
else
    echo "✗ Failed to get valid data for TVM"
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
    
    sed -i "s|https://[^/]*\.tvmi\.mt/[^/]*/live/3/0/index\.m3u8|https://${final_dist_host_tvmnews}/${jwt_tvmnews}/live/3${final_src_rel_tvmnews}|g" links/mt/tvmnews.m3u8
    echo "✓ Updated TVM News - Host: $final_dist_host_tvmnews, Path: $final_src_rel_tvmnews"
    update_count=$((update_count + 1))
else
    echo "✗ Failed to get valid data for TVM News"
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
    
    sed -i "s|https://[^/]*\.tvmi\.mt/[^/]*/live/4/0/index\.m3u8|https://${final_dist_host_tvmsport}/${jwt_tvmsport}/live/4${final_src_rel_tvmsport}|g" links/mt/tvmsport.m3u8
    echo "✓ Updated TVM Sport - Host: $final_dist_host_tvmsport, Path: $final_src_rel_tvmsport"
    update_count=$((update_count + 1))
else
    echo "✗ Failed to get valid data for TVM Sport"
fi

# Cleanup
rm -f "$cookie_file"

# Report results
if [ "$update_count" -eq 3 ]; then
    echo "✅ All M3U8 files updated successfully with dynamic hosts"
elif [ "$update_count" -gt 0 ]; then
    echo "⚠️  $update_count/3 M3U8 files updated"
else
    echo "❌ Failed to update any M3U8 files"
    exit 1
fi

exit 0
