#!/bin/bash

# Save session cookies to a file
cookie_file="cookies.txt"

# Fetch JWT token using cookies and browser-like headers
jwt_tvm=$(wget -qO- --keep-session-cookies --save-cookies "$cookie_file" \
                 --header="User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36" \
                 --header="accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7" \
                 --header="accept-language: en-US,en;q=0.9" \
                 --header="cookie: tvmi_gid=ODM5MTAwNjU5NTcxODM3NTQxMTM3; _ga=GA1.1.309400976.1743444398; tvmi_sid=MTIzMTAwNjU5NTcxODQwMjY1ODkx; _ga_2FFHHTTHE0=GS1.1.1745851410.6.0.1745851410.0.0.0" \
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

# Update the m3u8 file using the fetched token
sed -i "/https:\/\/dist9.tvmi.mt/ c https://dist9.tvmi.mt/${jwt_tvm}/live/2/0/index.m3u8" links/mt/tvm.m3u8
sed -i "/https:\/\/dist9.tvmi.mt/ c https://dist9.tvmi.mt/${jwt_tvm}/live/3/0/index.m3u8" links/mt/tvmnews.m3u8
sed -i "/https:\/\/dist9.tvmi.mt/ c https://dist9.tvmi.mt/${jwt_tvm}/live/4/0/index.m3u8" links/mt/tvmsport.m3u8

# Cleanup cookies
rm -f "$cookie_file"

# Exit the script
exit 0
