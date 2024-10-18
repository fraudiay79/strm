#!/bin/bash

cd /home/runner/work/strm/strm/iptv-org-epg && npm install

# AD EPG

#npm run grab -- --site=andorradifusio.ad --output=../epg/epg-ad.xml --days=3 --maxConnections=2

# BEIN EPG

npm run grab -- --channels=../epg/bein.channels.xml --output=../epg/epg-bein.xml --days=3 --maxConnections=10

# FO EPG

npm run grab -- --site=kvf.fo --output=../epg/epg-fo.xml --days=3 --maxConnections=2

# IS EPG

#npm run grab -- --channels=../epg/is.channels.xml --output=../epg/epg-is.xml --days=3 --maxConnections=10

# MT EPG

npm run grab -- --channels=../epg/mt.channels.xml --output=../epg/epg-mt.xml --days=3 --maxConnections=10

# NZ EPG

npm run grab -- --channels=../epg/nz.channels.xml --output=../epg/epg-nz.xml --days=3 --maxConnections=10

# PT EPG

#npm run grab -- --channels=../epg/pt.channels.xml --output=../epg/epg-pt.xml --days=3 --maxConnections=10

# Compress EPG xml files
cd ../epg/

gzip -k -f -9 epg*.xml

# Remove EPG xml files

rm epg*.xml

exit 0
