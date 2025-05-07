import base64

# Encoded string
encoded_str = "#FeyJpZCIFNTU2RzNEUQ==6InBsX29rIiwiZmlsZSI6Int2MX1jMDY1e3YyfWYyOWNiYjMzYjNmODI3FNTU2RzM=OTkxMWViYzhlIn0="

# Step 1: Remove leading "#"
encoded_str = encoded_str.lstrip("#")

# Debugging: Print extracted encoded string before decoding
print(f"Extracted Base64 string: {encoded_str}")

# Step 2: Fix incorrect padding
missing_padding = len(encoded_str) % 4
if missing_padding:
    encoded_str += "=" * (4 - missing_padding)

# Step 3: Decode Base64 safely with error handling
try:
    decoded_data = base64.b64decode(encoded_str).decode("utf-8", errors="replace")  # Replace invalid bytes
    print(f"Decoded Output: {decoded_data}")
except Exception as e:
    print(f"Error decoding: {e}")
