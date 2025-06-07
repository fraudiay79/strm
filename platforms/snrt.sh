#!/bin/bash

# Define an associative array mapping filenames to token URLs
declare -A files=(
    ["links/ma/aloula.m3u8"]="https://cdn.live.easybroadcast.io/abr_corp/73_aloula_w1dqfwm/playlist_dvr.m3u8"
    ["links/ma/almaghribia.m3u8"]="https://cdn.live.easybroadcast.io/abr_corp/73_almaghribia_83tz85q/playlist_dvr.m3u8"
    ["links/ma/arryadia.m3u8"]="https://cdn.live.easybroadcast.io/abr_corp/73_arryadia_k2tgcj0/playlist_dvr.m3u8"
    ["links/ma/assadissa.m3u8"]="https://cdn.live.easybroadcast.io/abr_corp/73_assadissa_7b7u5n1/playlist_dvr.m3u8"
    ["links/ma/athaqafia.m3u8"]="https://cdn.live.easybroadcast.io/abr_corp/73_arrabia_hthcj4p/playlist_dvr.m3u8"
    ["links/ma/laayoune.m3u8"]="https://cdn.live.easybroadcast.io/abr_corp/73_laayoune_pgagr52/playlist_dvr.m3u8"
    ["links/ma/tamazight.m3u8"]="https://cdn.live.easybroadcast.io/abr_corp/73_tamazight_tccybxt/playlist_dvr.m3u8"
)

# Iterate through each file and update tokens
for file in "${!files[@]}"; do
    token_url="https://token.easybroadcast.io/all?url=${files[$file]}"
    token=$(wget -qO- "$token_url" | grep -oP '(?<=token=)[^&]*')

    if [[ -n "$token" ]]; then
        sed -i "s#token=[^&]*#token=$token#g" "$file"
        echo "Updated token for $file"
    else
        echo "Failed to fetch token for $file"
    fi
done

exit 0
