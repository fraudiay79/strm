#!/bin/bash

cd /home/runner/work/strm/strm/fraudiay79-epg && npm install

# EPG

#npm run grab -- --site=starhubtvplus.com --output=../epg/epg-hk.xml --days=2 --maxConnections=20 --timeout=90000
#npm run grab -- --site=dishtv.in --output=../epg/epg-in2.xml --days=2 --maxConnections=20 --timeout=90000
#npm run grab -- --site=watch.tataplay.com --output=../epg/epg-in1.xml --days=2 --maxConnections=20 --timeout=90000
npm run grab -- --channels=../epg/channels/channels.xml --output=../epg/epg-channels.xml --days=2 --maxConnections=20 --timeout=90000

# Compress EPG xml files
cd ../epg/

gzip -k -f -9 epg*.xml

# Remove EPG xml files

rm epg*.xml

exit 0
