#!/bin/bash

cd /home/runner/work/strm/strm/iptv-org-epg && npm install

# IS EPG

npm run grab -- --channels=../epg/is.channels.xml --output=../epg/epg-is.xml --days=3 --maxConnections=10

# Compress EPG xml files
cd ../epg/

gzip -k -f -9 epg*.xml

# Remove EPG xml files

rm epg*.xml

exit 0
