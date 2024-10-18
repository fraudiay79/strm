#!/bin/bash

cd /home/runner/work/strm/strm/iptv-org-epg && npm install

# IS EPG

npm run grab -- --channels=../epg/is.channels.xml --output=../epg/epg-is.xml --days=7 --maxConnections=10

# RUV EPG

npm run grab -- --site=ruv.is --output=../epg/epg-ruv-is.xml --days=7 --maxConnections=2

# Sjonvarp EPG

npm run grab -- --site=sjonvarp.is --output=../epg/epg-sjonvarp-is.xml --days=7 --maxConnections=10

# Compress EPG xml files

xz -k -f -9 epg*.xml && gzip -k -f -9 epg*.xml

# Remove EPG xml files

rm epg*.xml

exit 0
