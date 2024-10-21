#! /usr/bin/python3


import requests
import os
import sys

windows = False
if 'win' in sys.platform:
    windows = True

def grab(url):
    response = s.get(url, timeout=15).text
    if '.m3u8' not in response:
        if windows:
            print('https://raw.githubusercontent.com/benmoose39/YouTube_to_m3u/main/assets/moose_na.m3u')
            return
        os.system(f'wget {url} -O temp.txt')
        response = ''.join(open('temp.txt').readlines())
        if '.m3u8' not in response:
            print('https://raw.githubusercontent.com/benmoose39/YouTube_to_m3u/main/assets/moose_na.m3u')
            return
    end = response.find('.m3u8') + 5
    tuner = 100
    while True:
        if 'https://' in response[end-tuner : end]:
            link = response[end-tuner : end]
            start = link.find('https://')
            end = link.find('.m3u8') + 5
            break
        else:
            tuner += 5
    streams = s.get(link[start:end]).text.split('#EXT')
    hd = streams[-1].strip()
    st = hd.find('http')
    print(hd[st:].strip())
    #print(f"{link[start : end]}")

print('#EXTM3U')
print('#EXT-X-VERSION:3')
print('#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2560000')
s = requests.Session()
result = grab(str(sys.argv[1]))          
            
if 'temp.txt' in os.listdir():
    os.system('rm temp.txt')
    os.system('rm watch*')
