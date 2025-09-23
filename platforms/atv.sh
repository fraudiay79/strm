#!/bin/bash

# Target URL
URL="https://securevideotoken.tmgrup.com.tr/webtv/secure?260329&url=https%3A%2F%2Ftrkvz-live.ercdn.net%2Fatvhd%2Fatvhd.m3u8&url2=https%3A%2F%2Ftrkvz-live.ercdn.net%2Fatvhd%2Fatvhd.m3u8"

# Headers
USER_AGENT="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
REFERER="https://www.atv.com.tr/"
ACCEPT="application/json, text/plain, */*"

# Output directory and file
OUTPUT_DIR="platform/links"
OUTPUT_FILE="$OUTPUT_DIR/atvtr.m3u8"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Temporary file for JSON response
TEMP_FILE=$(mktemp)

echo "Fetching secure video token URL..."
echo "URL: $URL"
echo "Output directory: $OUTPUT_DIR"

# Fetch the JSON response with headers
curl -s -L "$URL" \
  -H "User-Agent: $USER_AGENT" \
  -H "Referer: $REFERER" \
  -H "Accept: $ACCEPT" \
  -o "$TEMP_FILE"

# Check if curl was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to fetch the initial URL"
    rm -f "$TEMP_FILE"
    exit 1
fi

# Extract URL from JSON using grep and sed (alternative to jq)
M3U8_URL=$(grep -o '"Url":"[^"]*"' "$TEMP_FILE" | sed 's/"Url":"\([^"]*\)"/\1/' | head -1)

if [ -n "$M3U8_URL" ]; then
    echo "Extracted m3u8 URL: $M3U8_URL"
else
    echo "Error: Could not extract URL from JSON response"
    echo "JSON content:"
    cat "$TEMP_FILE"
    rm -f "$TEMP_FILE"
    exit 1
fi

# Download the actual m3u8 content with headers
echo "Downloading m3u8 content to $OUTPUT_FILE..."
curl -s -L "$M3U8_URL" \
  -H "User-Agent: $USER_AGENT" \
  -H "Referer: $REFERER" \
  -H "Accept: $ACCEPT" \
  -o "$OUTPUT_FILE"

# Check if download was successful
if [ $? -eq 0 ] && [ -s "$OUTPUT_FILE" ]; then
    echo "Successfully downloaded m3u8 content to $OUTPUT_FILE"
    echo "File size: $(wc -l < "$OUTPUT_FILE") lines"
    
    # Display the content preview
    echo "File content preview:"
    echo "---------------------"
    head -10 "$OUTPUT_FILE"
    echo "..."
    tail -5 "$OUTPUT_FILE"
else
    echo "Error: Failed to download m3u8 content"
    rm -f "$TEMP_FILE" "$OUTPUT_FILE"
    exit 1
fi

# Clean up
rm -f "$TEMP_FILE"

echo "Process completed successfully!"
echo "Master m3u8 file saved as: $OUTPUT_FILE"
