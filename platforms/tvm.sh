#!/bin/bash

# Fetch the data-jwt value once and store it in variables for reuse, using headers for wget
jwt_tvm=$(wget -qO- --header="User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36" \
                 --header="accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7" \
                 --header="accept-language: en-US,en;q=0.9" \
                 --header="sec-ch-ua: \"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"" \
                 --header="sec-ch-ua-mobile: ?0" \
                 --header="sec-ch-ua-platform: \"Windows\"" \
                 --header="sec-fetch-dest: document" \
                 --header="sec-fetch-mode: navigate" \
                 --header="sec-fetch-site: same-origin" \
                 --header="upgrade-insecure-requests: 1" \
                 https://tvmi.mt/live/2 | grep -oP 'data-jwt="\K[^"]+')

# Debugging: Print the token for verification
echo "JWT for tvm: $jwt_tvm"

# Update the m3u8 files using the fetched tokens
sed -i "/https:\/\/dist9.tvmi.mt/ c https://dist9.tvmi.mt/${jwt_tvm}/live/2/0/index.m3u8" links/tvm.m3u8

sed -i "/https:\/\/dist9.tvmi.mt/ c https://dist9.tvmi.mt/${jwt_tvm}/live/3/0/index.m3u8" links/tvmnews.m3u8

sed -i "/https:\/\/dist9.tvmi.mt/ c https://dist9.tvmi.mt/${jwt_tvm}/live/4/0/index.m3u8" links/tvmsport.m3u8

# Exit the script
exit 0
