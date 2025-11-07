from pathlib import Path

def check_existing_debug_files():
    """Check what's in the existing debug HTML files"""
    debug_dir = Path("debug")
    if not debug_dir.exists():
        print("❌ No debug directory found")
        return
    
    for html_file in debug_dir.glob("*.html"):
        print(f"\n📄 Checking {html_file}:")
        try:
            content = html_file.read_text(encoding='utf-8')
            
            # Check for key elements
            if 'sourceConfig' in content:
                print("✅ sourceConfig found")
                # Find sourceConfig context
                pos = content.find('sourceConfig')
                start = max(0, pos - 100)
                end = min(len(content), pos + 500)
                context = content[start:end]
                print("📝 Context:")
                print(context)
            
            if 'm3u8' in content:
                print("✅ m3u8 found in file")
                # Find m3u8 context
                import re
                m3u8_matches = re.findall(r'[^\s"\']+\.m3u8[^\s"\']*', content)
                for match in m3u8_matches[:3]:  # Show first 3 matches
                    print(f"   - {match}")
            
            if 'bitmovin' in content.lower():
                print("✅ bitmovin found")
                
            if 'alkassdigital' in content:
                print("✅ alkassdigital found")
                
        except Exception as e:
            print(f"❌ Error reading {html_file}: {e}")

if __name__ == "__main__":
    check_existing_debug_files()
