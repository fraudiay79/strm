#!/bin/bash

file1="links/pt/cnnpt.m3u8"
file2="links/pt/tvi.m3u8"
file3="links/pt/tviint.m3u8"

for file in "$file1" "$file2" "$file3"; do
  sed -i "s#wmsAuthSign=[^&]*#wmsAuthSign=$(wget -qO- https://services.iol.pt/matrix?userId -o /dev/null)#g" "$file"
done
exit 0
