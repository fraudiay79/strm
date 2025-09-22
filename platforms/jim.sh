#!/bin/bash

URL="https://mcc.nm-ovp.nelonenmedia.fi/v2/media/2584964"
OUTPUT_FILE="jim.m3u8"

# More comprehensive headers
curl -s -L \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  -H "Accept: application/json, text/plain, */*" \
  -H "Accept-Language: en-US,en;q=0.9,fi;q=0.8" \
  -H "Accept-Encoding: gzip, deflate, br" \
  -H "Referer: https://www.nelonenmedia.fi/" \
  -H "Origin: https://www.nelonenmedia.fi" \
  -H "DNT: 1" \
  -H "Connection: keep-alive" \
  -H "Sec-Fetch-Dest: empty" \
  -H "Sec-Fetch-Mode: cors" \
  -H "Sec-Fetch-Site: same-site" \
  -H "Pragma: no-cache" \
  -H "Cache-Control: no-cache" \
  "$URL" | jq -r '.streamUrls.webHls.url' > url.txt

M3U8_URL=$(cat url.txt)

if [ -n "$M3U8_URL" ] && [ "$M3U8_URL" != "null" ]; then
    echo "URL extracted: $M3U8_URL"
    
    curl -s -L \
      -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
      -H "Referer: https://www.nelonenmedia.fi/" \
      -H "Origin: https://www.nelonenmedia.fi" \
      "$M3U8_URL" | \
    awk -v base="${M3U8_URL%/*}/" '
    /^[^#].*\.m3u8/ {
        if ($0 ~ /^https?:\/\//) print $0
        else print base $0
        next
    }
    { print }' > "$OUTPUT_FILE"
    
    echo "Done!"
else
    echo "Failed to extract URL"
    exit 1
fi
