import streamlink
import sys
import os 
import json

def info_to_text(stream_info, url):
    text = '#EXT-X-STREAM-INF:'
    if stream_info.program_id:
        text = text + 'PROGRAM-ID=' + str(stream_info.program_id) + ','
    if stream_info.bandwidth:
        text = text + 'BANDWIDTH=' + str(stream_info.bandwidth) + ','
    if stream_info.codecs:
        text = text + 'CODECS="'
        codecs = stream_info.codecs
        for i in range(0, len(codecs)):
            text = text + codecs[i]
            if len(codecs) - 1 != i:
                text = text + ','
        text = text + '",'
    if stream_info.resolution.width:
        text = text + 'RESOLUTION=' + str(stream_info.resolution.width) + 'x' + str(stream_info.resolution.height) 

    text = text + "\n" + url + "\n"
    return text

def main():
    # Loading config file
    f = open(sys.argv[1], "r")
    streams = json.load(f)

    # Getting output options and creating folders
    folder_name = streams["output"]["folder"]
    master_folder_name = streams["output"]["masterFolder"]
    current_dir = os.getcwd()
    root_folder = os.path.join(current_dir, folder_name)
    master_folder = os.path.join(root_folder, master_folder_name)
    os.makedirs(master_folder, exist_ok=True)

    channels = streams["channels"]
    for channel in channels:
        # Get streams and playlists
        try:
            url = channel["url"]
            streams = streamlink.streams(url)
            playlists = streams['best'].multivariant.playlists

            # Text preparation
            previous_res_height = 0
            master_text = ''

            # Check http/https options
            http_flag = False
            if url.startswith("http://"):
                plugin_name, plugin_type, given_url  = streamlink.session.Streamlink().resolve_url(url)
                http_flag = True

            for playlist in playlists:
                uri = playlist.uri
                info = playlist.stream_info
                # Sorting sub-playlist based on 
                if info.video != "audio_only": 
                    sub_text = info_to_text(info, uri)
                    if info.resolution.height > previous_res_height:
                        master_text = sub_text  + master_text
                    else:
                        master_text = master_text + sub_text
                    previous_res_height = info.resolution.height
            
            # Necessary values for HLS
            if master_text:
                if streams['best'].multivariant.version:
                    master_text = '#EXT-X-VERSION:' + str(streams['best'].multivariant.version) + "\n" + master_text
                master_text = '#EXTM3U\n' + master_text

            # HTTPS -> HTTP for cinergroup plugin
            if http_flag:
                if plugin_name == "cinergroup":
                    master_text = master_text.replace("https://", "http://")

            # File operations
            master_file_path = os.path.join(master_folder, channel["slug"] + ".m3u8")

            if master_text:
                master_file = open(master_file_path, "w+")
                master_file.write(master_text)
                master_file.close()
                
            else:
                if os.path.isfile(master_file_path):
                    os.remove(master_file_path)
        except Exception as e:
            master_file_path = os.path.join(master_folder, channel["slug"] + ".m3u8")
            if os.path.isfile(master_file_path):
                os.remove(master_file_path)

if __name__=="__main__": 
    main()
