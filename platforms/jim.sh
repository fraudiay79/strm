#!/bin/bash

# URL to fetch the JSON data from
URL="https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584964"
OUTPUT_FILE="jim.m3u8"

# Fetch the JSON data and extract the m3u8 URL from the webHls stream
M3U8_URL=$(curl -s "$URL" | grep -o '"webHls"[^}]*' | grep -o '"url":"[^"]*"' | cut -d'"' -f4)

# Check if the URL was successfully extracted
if [ -n "$M3U8_URL" ]; then
    echo "Extracted m3u8 URL: $M3U8_URL"
    
    # Fetch the m3u8 content and save it to the file
    if curl -s "$M3U8_URL" -o "$OUTPUT_FILE"; then
        echo "Successfully saved m3u8 content to $OUTPUT_FILE"
    else
        echo "Error: Failed to fetch m3u8 content from the URL"
        exit 1
    fi
else
    echo "Error: Could not extract m3u8 URL from the JSON response"
    exit 1
fi
