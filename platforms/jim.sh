#!/bin/bash

# URL to fetch the JSON data from
URL="https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584964"
OUTPUT_FILE="jim.m3u8"
TEMP_FILE=$(mktemp)

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install jq first."
    echo "On Ubuntu/Debian: sudo apt-get install jq"
    echo "On macOS: brew install jq"
    exit 1
fi

# Fetch the JSON data and extract the m3u8 URL using jq
M3U8_URL=$(curl -s "$URL" | jq -r '.streamUrls.webHls.url')

# Check if the URL was successfully extracted
if [ -n "$M3U8_URL" ] && [ "$M3U8_URL" != "null" ]; then
    echo "Extracted m3u8 URL: $M3U8_URL"
    
    # Fetch the m3u8 content and save it to a temporary file
    if curl -s "$M3U8_URL" -o "$TEMP_FILE"; then
        echo "Successfully fetched m3u8 content"
        
        # Extract the base URL (everything before the last slash)
        BASE_URL="${M3U8_URL%/*}/"
        
        # Process the m3u8 file to convert relative URLs to absolute URLs
        while IFS= read -r line; do
            if [[ "$line" =~ ^[^#].*\.m3u8 ]]; then
                # This is a URL line (not starting with #), convert to absolute URL
                if [[ "$line" =~ ^https?:// ]]; then
                    # Already an absolute URL, use as is
                    echo "$line"
                else
                    # Relative URL, prepend base URL
                    echo "${BASE_URL}${line}"
                fi
            else
                # This is a comment or header line, output as is
                echo "$line"
            fi
        done < "$TEMP_FILE" > "$OUTPUT_FILE"
        
        echo "Successfully saved processed m3u8 content to $OUTPUT_FILE"
        
        # Clean up temporary file
        rm "$TEMP_FILE"
    else
        echo "Error: Failed to fetch m3u8 content from the URL"
        rm "$TEMP_FILE" 2>/dev/null
        exit 1
    fi
else
    echo "Error: Could not extract m3u8 URL from the JSON response"
    exit 1
fi
