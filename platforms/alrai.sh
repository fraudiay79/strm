#!/bin/bash

# URL to fetch
URL="https://www.alraimedia.com/livestream/"
OUTPUT_DIR="links"
OUTPUT_FILE="$OUTPUT_DIR/alraitv_playlist.m3u8"

# Create links directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Fetch the HTML content
echo "Fetching content from $URL..."
HTML_CONTENT=$(curl -s "$URL")

# Extract the JavaScript configuration containing the M3U8 URL
echo "Extracting M3U8 URL..."

# Extract the sources array from the JavaScript object
SOURCES=$(echo "$HTML_CONTENT" | grep -o 'sources: \[[^]]*\]' | head -1)

# Extract the M3U8 URL from the sources array
M3U8_URL=$(echo "$SOURCES" | grep -o 'https://[^"]*playlist\.m3u8[^"]*' | head -1)

if [ -z "$M3U8_URL" ]; then
    echo "Error: Could not extract M3U8 URL from the page"
    exit 1
fi

echo "Found M3U8 URL: $M3U8_URL"

# Extract the base URL and parameters for constructing the master playlist
BASE_URL=$(echo "$M3U8_URL" | sed 's|/playlist\.m3u8.*||')
PARAMS=$(echo "$M3U8_URL" | grep -o 'hdnts=[^&]*' | sed 's/hdnts=//')

# Convert hdnts to hdntl format (similar to your example)
# This is a simplified conversion - you may need to adjust based on actual requirements
HDNTL=$(echo "$PARAMS" | sed 's/exp=/exp=1758975011~acl=%2falraimedialive%2falraitv.smil%2f*~data=hdntl~hmac=/')

# Create the master M3U8 playlist
echo "Creating master playlist: $OUTPUT_FILE"

cat > "$OUTPUT_FILE" << EOF
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2104321,FRAME-RATE=25,RESOLUTION=1920x1080,CODECS="avc1.4d0028,mp4a.40.2",CLOSED-CAPTIONS=NONE
$BASE_URL/alraitv_source/hdntl=$HDNTL/chunks.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1163432,FRAME-RATE=25,RESOLUTION=854x480,CODECS="avc1.77.30,mp4a.40.2",CLOSED-CAPTIONS=NONE
$BASE_URL/alraitv_480p/hdntl=$HDNTL/chunks.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=619100,FRAME-RATE=25,RESOLUTION=426x240,CODECS="avc1.42c015,mp4a.40.2",CLOSED-CAPTIONS=NONE
$BASE_URL/alraitv_240p/hdntl=$HDNTL/chunks.m3u8
EOF

echo "Master playlist created successfully: $OUTPUT_FILE"
echo "You can play it with: mpv $OUTPUT_FILE or vlc $OUTPUT_FILE"
