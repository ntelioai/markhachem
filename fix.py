import re
import urllib.request
import os

os.makedirs('assets/images/artists', exist_ok=True)

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'<div class="artist-card-image">\s*(.*?)\s*<div class="artist-card-arrow">'
matches = re.finditer(pattern, content, flags=re.DOTALL)
missing = 0
for m in matches:
    if '<img' not in m.group(1):
        missing += 1

dl_url = "https://picsum.photos/400/400"
try:
    req = urllib.request.Request(dl_url, headers={'User-Agent': 'Mozilla/5.0'})
    data = urllib.request.urlopen(req).read()
    with open("assets/images/artists/generic.jpg", 'wb') as f:
        f.write(data)
except Exception as e:
    print("DL failed:", e)

idx = 0
def repler(m):
    global idx
    inner = m.group(1)
    if '<img' not in inner:
        idx += 1
        return '<div class="artist-card-image">\n            <img src="assets/images/artists/generic.jpg" alt="Artwork">\n            <div class="artist-card-arrow">'
    return m.group(0)

new_content = re.sub(pattern, repler, content, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)
print(f"Patched index.html successfully")
