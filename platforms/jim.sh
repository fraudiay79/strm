#!/bin/bash

# URL to fetch the JSON data from
URL="https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584964"
OUTPUT_FILE="jim.m3u8"
TEMP_FILE=$(mktemp)

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install jq first."
    exit 1
fi

# Fetch the JSON data and extract the m3u8 URL using jq
M3U8_URL=$(curl -s "$URL" | jq -r '.streamUrls.webHls.url')

if [ -n "$M3U8_URL" ] && [ "$M3U8_URL" != "null" ]; then
    echo "Extracted m3u8 URL: $M3U8_URL"
    
    if curl -s "$M3U8_URL" -o "$TEMP_FILE"; then
        # Extract base URL and convert relative URLs to absolute
        BASE_URL="${M3U8_URL%/*}/"
        
        # Use sed to convert relative URLs to absolute URLs
        sed -e "s|^\([^#].*\.m3u8\)|$BASE_URL\1|" \
            -e "s|^\([^#].*\.m3u8?\)|$BASE_URL\1|" "$TEMP_FILE" > "$OUTPUT_FILE"
        
        echo "Successfully saved processed m3u8 content to $OUTPUT_FILE"
        rm "$TEMP_FILE"
    else
        echo "Error: Failed to fetch m3u8 content"
        rm "$TEMP_FILE" 2>/dev/null
        exit 1
    fi
else
    echo "Error: Could not extract m3u8 URL"
    exit 1
fi
