#!/bin/bash

# URL to fetch the JSON data from
URL="https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584964"
OUTPUT_FILE="jim.m3u8"
TEMP_FILE=$(mktemp)
DEBUG_FILE="debug_response.json"

echo "Fetching JSON response from: $URL"

# First, let's see what the actual response looks like
curl -s -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" "$URL" > "$DEBUG_FILE"

echo "Raw response saved to: $DEBUG_FILE"
echo "First 200 characters of response:"
head -c 200 "$DEBUG_FILE"
echo -e "\n"

# Check if the response is valid JSON and extract the URL using different possible paths
M3U8_URL=$(cat "$DEBUG_FILE" | jq -r '.streamUrls.webHls.url // .streamUrls.android.url // .streamUrls.apple.url // .streamUrls.hls // .hls_url // .url // empty' 2>/dev/null)

if [ -z "$M3U8_URL" ]; then
    echo "Trying alternative extraction methods..."
    
    # Try to find any URL that contains m3u8
    M3U8_URL=$(cat "$DEBUG_FILE" | grep -o '"url":[^,]*' | grep m3u8 | head -1 | cut -d'"' -f4)
fi

if [ -z "$M3U8_URL" ]; then
    echo "Response content:"
    cat "$DEBUG_FILE"
    echo -e "\nError: Could not extract m3u8 URL from the JSON response"
    echo "Available keys in JSON:"
    cat "$DEBUG_FILE" | jq -r 'keys[]' 2>/dev/null || cat "$DEBUG_FILE" | jq -r '.streamUrls | keys[]' 2>/dev/null || echo "Cannot parse JSON structure"
    exit 1
fi

echo "Extracted m3u8 URL: $M3U8_URL"

# Fetch the m3u8 content
if curl -s -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" "$M3U8_URL" -o "$TEMP_FILE"; then
    echo "Successfully fetched m3u8 content"
    
    # Check if the file is actually an m3u8 file
    if ! head -1 "$TEMP_FILE" | grep -q "EXTM3U"; then
        echo "Warning: Downloaded content doesn't appear to be a valid m3u8 file"
        echo "First line: $(head -1 "$TEMP_FILE")"
    fi
    
    # Extract base URL and convert relative URLs to absolute
    BASE_URL="${M3U8_URL%/*}/"
    
    # Process with awk to convert relative URLs
    awk -v base="$BASE_URL" '
    /^[^#].*\.m3u8/ {
        if ($0 ~ /^https?:\/\//) {
            print $0
        } else {
            print base $0
        }
        next
    }
    { print }' "$TEMP_FILE" > "$OUTPUT_FILE"
    
    echo "Successfully saved processed m3u8 content to $OUTPUT_FILE"
    echo "First few lines of output:"
    head -10 "$OUTPUT_FILE"
    
    rm "$TEMP_FILE"
else
    echo "Error: Failed to fetch m3u8 content from the URL"
    rm "$TEMP_FILE" 2>/dev/null
    exit 1
fi

# Clean up
rm "$DEBUG_FILE" 2>/dev/null
