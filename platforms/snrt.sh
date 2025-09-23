#!/bin/bash

# Define arrays for files and their corresponding token URLs
files=("links/ma/aloula.m3u8" "links/ma/almaghribia.m3u8" "links/ma/arryadia.m3u8" "links/ma/assadissa.m3u8" "links/ma/athaqafia.m3u8" "links/ma/laayoune.m3u8" "links/ma/tamazight.m3u8")
urls=("https://cdn.live.easybroadcast.io/abr_corp/73_aloula_w1dqfwm/playlist_dvr.m3u8"
      "https://cdn.live.easybroadcast.io/abr_corp/73_almaghribia_83tz85q/playlist_dvr.m3u8"
      "https://cdn.live.easybroadcast.io/abr_corp/73_arryadia_k2tgcj0/playlist_dvr.m3u8"
      "https://cdn.live.easybroadcast.io/abr_corp/73_assadissa_7b7u5n1/playlist_dvr.m3u8"
      "https://cdn.live.easybroadcast.io/abr_corp/73_arrabia_hthcj4p/playlist_dvr.m3u8"
      "https://cdn.live.easybroadcast.io/abr_corp/73_laayoune_pgagr52/playlist_dvr.m3u8"
      "https://cdn.live.easybroadcast.io/abr_corp/73_tamazight_tccybxt/playlist_dvr.m3u8")

# Loop through both arrays using index tracking
for i in "${!files[@]}"; do
    token_url="https://token.easybroadcast.io/all?url=${urls[$i]}"
    token=$(wget -qO- "$token_url" | grep -oP '(?<=token=)[^&]*')

    if [[ -n "$token" ]]; then
        # Extract the channel ID from the URL
        channel_id=$(echo "${urls[$i]}" | grep -oP '(?<=abr_corp/)[^/]+')
        
        # Create a more specific pattern for the stream URLs
        # This matches the specific pattern seen in your example output
        sed -i "s|\(https://cdn.live.easybroadcast.io/abr_corp/${channel_id}/corp/${channel_id}_[^/]*/chunks_dvr.m3u8\)?token=[^[:space:]]*|\1?token=$token|g" "${files[$i]}"
        
        echo "Updated token for ${files[$i]}"
    else
        echo "Failed to fetch token for ${files[$i]}"
    fi
done

exit 0
