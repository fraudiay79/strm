import requests
import re
import json

def get_jurnaltv_direct():
    """Direct approach to get the current live stream"""
    try:
        # The website might be using an API or embedded player
        url = "https://www.jurnaltv.md/page/live"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Look for JavaScript variables containing stream info
        patterns = [
            r'file["\']?:\s*["\'](https://[^"\']+\.m3u8[^"\']*token=[a-f0-9]{40})',
            r'source["\']?:\s*["\'](https://[^"\']+\.m3u8[^"\']*token=[a-f0-9]{40})',
            r'src["\']?:\s*["\'](https://[^"\']+\.m3u8[^"\']*token=[a-f0-9]{40})',
            r'token=([a-f0-9]{40})'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, response.text)
            if matches:
                print(f"Pattern matched: {pattern}")
                print(f"Matches found: {matches}")
                # Use the last match as it's likely the most current
                return matches[-1] if isinstance(matches[-1], str) else None
                
        return None
        
    except Exception as e:
        print(f"Error: {e}")
        return None

# Test both approaches
print("=== Method 1: Direct token extraction ===")
result1 = get_jurnaltv_m3u8()
if result1:
    print(result1)
else:
    print("Method 1 failed")

print("\n=== Method 2: Pattern matching ===")
result2 = get_jurnaltv_direct()
if result2:
    print(f"Extracted value: {result2}")
else:
    print("Method 2 failed")
