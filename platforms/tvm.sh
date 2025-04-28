#!/bin/bash

sed -i "/https:\/\/dist9.tvmi.mt/ c https://dist9.tvmi.mt/$(wget -qO- https://tvmi.mt/live/2 | grep -oP 'data-jwt="\K[^"]+')/live/4/0/index.m3u8" platforms/links/tvm.m3u8

sed -i "/https:\/\/dist9.tvmi.mt/ c https://dist9.tvmi.mt/$(wget -qO- https://tvmi.mt/live/3 | grep -oP 'data-jwt="\K[^"]+')/live/3/0/index.m3u8" platforms/links/tvmnews.m3u8

sed -i "/https:\/\/dist9.tvmi.mt/ c https://dist9.tvmi.mt/$(wget -qO- https://tvmi.mt/live/4 | grep -oP 'data-jwt="\K[^"]+')/live/4/0/index.m3u8" platforms/links/tvmsport.m3u8

exit 0
