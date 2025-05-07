import base64

# Encoded string
encoded_str = "#FeyJpZCI6InBsX29rIiwiZmlsZSI6Int2MX01MjRFNTU2RzNEUTFW7djJ9ZjE3NzI3ZjkzNmI4MDE5ZmMyYTAFNTU2RzNEUQ==5In0="

# Step 1: Remove leading "#"
encoded_str = encoded_str.lstrip("#")

# Step 2: Fix incorrect padding
missing_padding = len(encoded_str) % 4
if missing_padding:
    encoded_str += "=" * (4 - missing_padding)

# Step 3: Decode Base64
try:
    decoded_data = base64.b64decode(encoded_str).decode("utf-8")
    print("Decoded Output:", decoded_data)
except Exception as e:
    print("Error decoding:", e)
