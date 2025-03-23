#!/bin/bash

cd /home/runner/work/strm/strm/fraudiay79-epg-grab && npm install

# EPG

npm run grab -- --channels=../epg/channels/channels.xml --output=../epg/epg-channels.xml --days=2 --maxConnections=25 --timeout=90000

# Compress EPG xml files
cd ../epg/

gzip -k -f -9 epg*.xml

# Remove EPG xml files

rm epg*.xml

exit 0
