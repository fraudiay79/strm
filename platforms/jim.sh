#!/bin/bash

# URL to fetch the JSON data from
URL="https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584964"
OUTPUT_FILE="jim.m3u8"
TEMP_FILE=$(mktemp)

# Headers that might be required
USER_AGENT="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
REFERER="https://www.nelonenmedia.fi/"
ACCEPT="application/json, text/plain, */*"

echo "Fetching JSON from API..."

# Fetch JSON with headers
JSON_RESPONSE=$(curl -s \
  -H "User-Agent: $USER_AGENT" \
  -H "Referer: $REFERER" \
  -H "Accept: $ACCEPT" \
  -H "Accept-Language: en-US,en;q=0.9" \
  -H "Origin: https://www.nelonenmedia.fi" \
  "$URL")

# Check if we got a valid response
if [ -z "$JSON_RESPONSE" ]; then
    echo "Error: Empty response from API"
    exit 1
fi

echo "API Response received"
echo "$JSON_RESPONSE" | head -c 200
echo -e "\n"

# Extract m3u8 URL using jq
M3U8_URL=$(echo "$JSON_RESPONSE" | jq -r '.streamUrls.webHls.url // .streamUrls.android.url // empty')

if [ -z "$M3U8_URL" ] || [ "$M3U8_URL" = "null" ]; then
    echo "Error: Could not extract m3u8 URL"
    echo "Available keys:"
    echo "$JSON_RESPONSE" | jq 'keys' 2>/dev/null || echo "Invalid JSON"
    exit 1
fi

echo "Extracted m3u8 URL: $M3U8_URL"

# Fetch the m3u8 content with same headers
echo "Fetching m3u8 content..."
curl -s \
  -H "User-Agent: $USER_AGENT" \
  -H "Referer: $REFERER" \
  -H "Accept: application/x-mpegURL, application/vnd.apple.mpegurl, */*" \
  "$M3U8_URL" -o "$TEMP_FILE"

# Check if download was successful
if [ ! -s "$TEMP_FILE" ]; then
    echo "Error: Failed to fetch m3u8 content (file empty or 401 error)"
    echo "HTTP Status:"
    curl -I -s \
      -H "User-Agent: $USER_AGENT" \
      -H "Referer: $REFERER" \
      "$M3U8_URL" | head -10
    rm "$TEMP_FILE"
    exit 1
fi

# Check if it's a valid m3u8 file
if ! head -1 "$TEMP_FILE" | grep -q "EXTM3U"; then
    echo "Warning: Downloaded content may not be valid m3u8"
    echo "First line: $(head -1 "$TEMP_FILE")"
    
    # Check if it's an error message
    if grep -q "401" "$TEMP_FILE" || grep -q "Unauthorized" "$TEMP_FILE"; then
        echo "Error: Authentication required (401)"
        cat "$TEMP_FILE"
        rm "$TEMP_FILE"
        exit 1
    fi
fi

# Process the file to convert relative URLs to absolute
BASE_URL="${M3U8_URL%/*}/"
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

echo "Successfully created $OUTPUT_FILE"
echo "File preview:"
head -10 "$OUTPUT_FILE"

rm "$TEMP_FILE"
