#!/bin/bash

# Directory to save output files
output_dir="links/ng"
mkdir -p "$output_dir"

# URL to fetch the JSON data
API_URL="https://uvotv.com/api/web/live-channels/v2/1139/url"

# Headers for the API request
headers=(
    "accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"
    "accept-language: en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7,ar-MA;q=0.6,ar;q=0.5"
    "cache-control: max-age=0"
    "priority: u=0, i"
    "sec-ch-ua: \"Google Chrome\";v=\"141\", \"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"141\""
    "sec-ch-ua-mobile: ?0"
    "sec-ch-ua-platform: \"Windows\""
    "sec-fetch-dest: document"
    "sec-fetch-mode: navigate"
    "sec-fetch-site: cross-site"
    "sec-fetch-user: ?1"
    "upgrade-insecure-requests: 1"
    "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
)

# Cookie string
cookie='_gcl_au=1.1.1977328394.1759494547; _ga=GA1.1.151876816.1759494547; session-GUID=b16e9f01-ec53-4ed3-8969-c4999437415a; ovp.sid=s%3A2RczUtjnxYRwy0xIfbmV_cAvcVRWlyT2.wCHmRqanTzw8o2kUlDAINuU%2F71jyWxNoxjBlnpdRB0M; _scid=FbhIa63nhiL--hmqLw-M_u7NBOxUIfEW; _tt_enable_cookie=1; _ttp=01K6N0RA8DRGKTPEMEDDPRQNVK_.tt.1; _ym_uid=1759494548154782380; _ym_d=1759494548; _ScCbts=%5B%5D; _sctr=1%7C1760414400000; _scid_r=LzhIa63nhiL--hmqLw-M_u7NBOxUIfEW6veZTQ; _ym_isad=1; ttcsid=1760961684258::JD1I7VmIEx1W-ceVGVZT.14.1760961698322.0; ttcsid_CUGACIJC77U8E2TJIKF0=1760961684257::gxMbl1GC2BpWej9539oC.14.1760961698322.0; _ga_VHYF8SPDF4=GS2.1.s1760961683$o12$g1$t1760961863$j60$l0$h336694408; _ga_9EXRJ4BBQD=GS2.1.s1760961683$o12$g1$t1760961920$j60$l0$h0'

# Build curl command with headers
curl_cmd="curl -s '$API_URL'"
for header in "${headers[@]}"; do
    curl_cmd="$curl_cmd -H '$header'"
done
curl_cmd="$curl_cmd -b '$cookie'"

# Extract the playback URL from the JSON response
PLAYBACK_URL=$(eval $curl_cmd | grep -o '"playbackUrl":"[^"]*' | cut -d'"' -f4)

if [ -z "$PLAYBACK_URL" ]; then
    echo "Error: Could not extract playback URL from the API response"
    exit 1
fi

echo "Extracted playback URL: $PLAYBACK_URL"

# Extract the base URL (everything before playlist.m3u8)
BASE_URL="${PLAYBACK_URL%%playlist.m3u8*}"

# Fetch the playlist.m3u8 content and extract the relative path
PLAYLIST_CONTENT=$(curl -s "$PLAYBACK_URL")

if [ -z "$PLAYLIST_CONTENT" ]; then
    echo "Error: Could not fetch playlist content from $PLAYBACK_URL"
    exit 1
fi

# Extract the relative path from the playlist content
# Look for the line that contains the stream path but doesn't start with #
RELATIVE_PATH=$(echo "$PLAYLIST_CONTENT" | grep -v '^#' | head -n1)

if [ -z "$RELATIVE_PATH" ]; then
    echo "Error: Could not extract relative path from playlist content"
    exit 1
fi

# Construct the final URL
FINAL_URL="${BASE_URL}${RELATIVE_PATH}"

# Extract the header lines from the original playlist
PLAYLIST_HEADER=$(echo "$PLAYLIST_CONTENT" | grep '^#')

# Create the final m3u8 content in the output directory
OUTPUT_FILE="$output_dir/channels_tv.m3u8"
echo "Creating final m3u8 content in $OUTPUT_FILE..."
echo "$PLAYLIST_HEADER" > "$OUTPUT_FILE"
echo "$FINAL_URL" >> "$OUTPUT_FILE"

echo ""
echo "Final m3u8 file created: $OUTPUT_FILE"
echo "Final URL: $FINAL_URL"
