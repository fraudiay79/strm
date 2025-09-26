#!/bin/bash

# URL to fetch
URL="https://www.alraimedia.com/livestream/"
OUTPUT_DIR="links"
OUTPUT_FILE="$OUTPUT_DIR/alrai.m3u8"

# Create links directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Fetch the HTML content
echo "Fetching content from $URL..."
HTML_CONTENT=$(curl -s "$URL")

# Save the raw HTML for debugging
echo "$HTML_CONTENT" > "$OUTPUT_DIR/debug_html.html"
echo "Raw HTML saved to $OUTPUT_DIR/debug_html.html for inspection"

# Try multiple extraction methods
echo "Attempting to extract M3U8 URL using different methods..."

# Method 1: Look for the specific JavaScript pattern from your example
M3U8_URL=$(echo "$HTML_CONTENT" | grep -o "https://live.kwikmotion.com[^\"]*playlist.m3u8[^\"]*" | head -1)

# Method 2: Look for any M3U8 URL in the entire content
if [ -z "$M3U8_URL" ]; then
    M3U8_URL=$(echo "$HTML_CONTENT" | grep -o "https://[^\"]*\.m3u8[^\"]*" | head -1)
fi

# Method 3: Look for the KwikMotion script and extract from sources array
if [ -z "$M3U8_URL" ]; then
    # Extract the entire KwikMotion script block
    SCRIPT_BLOCK=$(echo "$HTML_CONTENT" | grep -A 20 "kwikMotion" | head -30)
    if [ -n "$SCRIPT_BLOCK" ]; then
        M3U8_URL=$(echo "$SCRIPT_BLOCK" | grep -o "https://[^\"]*\.m3u8[^\"]*" | head -1)
    fi
fi

# Method 4: Look for the specific file pattern in sources array
if [ -z "$M3U8_URL" ]; then
    M3U8_URL=$(echo "$HTML_CONTENT" | grep -o 'file: "[^"]*\.m3u8[^"]*"' | sed 's/file: "//' | sed 's/"//' | head -1)
fi

# Method 5: Look for any URL containing "alraitv" and "m3u8"
if [ -z "$M3U8_URL" ]; then
    M3U8_URL=$(echo "$HTML_CONTENT" | grep -o "https://[^\"]*alraitv[^\"]*\.m3u8[^\"]*" | head -1)
fi

# Debug: Show what was found
if [ -n "$M3U8_URL" ]; then
    echo "Successfully extracted M3U8 URL: $M3U8_URL"
else
    echo "Debug: Checking for alternative patterns..."
    
    # Show what patterns exist in the HTML
    echo "=== Checking for KwikMotion references ==="
    echo "$HTML_CONTENT" | grep -i "kwik" | head -5
    
    echo "=== Checking for any M3U8 references ==="
    echo "$HTML_CONTENT" | grep -i "m3u8" | head -5
    
    echo "=== Checking for script blocks ==="
    echo "$HTML_CONTENT" | grep -A 5 -B 5 "sources" | head -20
    
    # If still no URL, try to extract from the JavaScript file
    JS_URL=$(echo "$HTML_CONTENT" | grep -o "https://player.kwikmotion.com[^\"]*\.js" | head -1)
    if [ -n "$JS_URL" ]; then
        echo "Found JavaScript file: $JS_URL"
        echo "Attempting to extract from JavaScript..."
        JS_CONTENT=$(curl -s "$JS_URL")
        M3U8_URL=$(echo "$JS_CONTENT" | grep -o "https://[^\"]*\.m3u8[^\"]*" | head -1)
    fi
fi

if [ -z "$M3U8_URL" ]; then
    echo "Error: Could not extract M3U8 URL from the page using any method"
    echo "Please check the debug_html.html file to see the actual page content"
    exit 1
fi

echo "Found M3U8 URL: $M3U8_URL"

# Now create the master playlist based on the pattern you provided
echo "Creating master playlist: $OUTPUT_FILE"

# Extract base components and create the multi-quality playlist
BASE_URL="https://live.kwikmotion.com/alraitvpublish"

# Extract the token parameters from the original URL
# The token format seems to be: hdnts=exp=1758888577~acl=/alraimedialive/alraitv.smil/*~hmac=12327e6236558c7e22eab8215e4eadeab626b2a22269cba80b79cd3c1f52ba18
TOKEN=$(echo "$M3U8_URL" | grep -o "hdnts=[^&]*" | sed 's/hdnts=//')

if [ -z "$TOKEN" ]; then
    # If no token found, use a placeholder
    TOKEN="exp=1758975011~acl=%2falraimedialive%2falraitv.smil%2f*~data=hdntl~hmac=15ddb8e8b7a40d874292a74f6f8ae90c48bba76fb294d32bc5c98f7be3b2105e"
else
    # Convert hdnts to hdntl format as in your example
    TOKEN=$(echo "$TOKEN" | sed 's/hdnts=//' | sed 's/exp=/exp=1758975011~acl=%2falraimedialive%2falraitv.smil%2f*~data=hdntl~hmac=/')
fi

# Create the master M3U8 playlist with multiple quality levels
cat > "$OUTPUT_FILE" << EOF
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2104321,FRAME-RATE=25,RESOLUTION=1920x1080,CODECS="avc1.4d0028,mp4a.40.2",CLOSED-CAPTIONS=NONE
$BASE_URL/alraitv_source/hdntl=$TOKEN/chunks.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1163432,FRAME-RATE=25,RESOLUTION=854x480,CODECS="avc1.77.30,mp4a.40.2",CLOSED-CAPTIONS=NONE
$BASE_URL/alraitv_480p/hdntl=$TOKEN/chunks.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=619100,FRAME-RATE=25,RESOLUTION=426x240,CODECS="avc1.42c015,mp4a.40.2",CLOSED-CAPTIONS=NONE
$BASE_URL/alraitv_240p/hdntl=$TOKEN/chunks.m3u8
EOF

echo "Master playlist created successfully: $OUTPUT_FILE"
echo "You can play it with: mpv $OUTPUT_FILE or vlc $OUTPUT_FILE"
