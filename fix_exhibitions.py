import re
import urllib.request
import os
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context
os.makedirs('assets/images/exhibitions', exist_ok=True)

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'<div class="exhibition-card-image">\s*<img src="([^"]+)" alt="([^"]+)">\s*</div>'
hdr = {'User-Agent': 'Mozilla/5.0'}

def get_duckduckgo_image(query):
    try:
        url = f"https://html.duckduckgo.com/html/?q={query}"
        req = urllib.request.Request(url, headers=hdr)
        html = urllib.request.urlopen(req).read().decode('utf-8')
        
        vqd_match = re.search(r'vqd=([\d-]+)', html)
        if not vqd_match: return None
        
        vqd = vqd_match.group(1)
        img_url = f"https://duckduckgo.com/i.js?q={query}&vqd={vqd}"
        req2 = urllib.request.Request(img_url, headers=hdr)
        data = json.loads(urllib.request.urlopen(req2).read().decode('utf-8'))
        
        if data.get('results'):
            real_img = data['results'][0]['image']
            req3 = urllib.request.Request(real_img, headers=hdr)
            return urllib.request.urlopen(req3, timeout=5).read()
    except Exception as e:
        print(f"Error fetching {query}: {e}")
    return None

matches = list(re.finditer(pattern, content))
print(f"Found {len(matches)} exhibition cards")

for m in matches:
    original_src = m.group(1)
    alt_text = m.group(2)
    
    # Generate valid filename
    safe_name = alt_text.lower().replace(' ', '-').replace('&amp;', 'and').replace('&', 'and')
    safe_name = re.sub(r'[^a-z0-9-]', '', safe_name)
    fname = f"assets/images/exhibitions/{safe_name}.jpg"
    
    print(f"Checking {alt_text}...")
    if not os.path.exists(fname):
        query = urllib.parse.quote(alt_text + ' mark hachem')
        img_data = get_duckduckgo_image(query)
        if img_data:
            with open(fname, 'wb') as f_out:
                f_out.write(img_data)
            print(f" > Saved to {fname}")
        else:
            print(f" > Failed to find image for {alt_text}")

# Now replace
def repler(m):
    alt_text = m.group(2)
    safe_name = alt_text.lower().replace(' ', '-').replace('&amp;', 'and').replace('&', 'and')
    safe_name = re.sub(r'[^a-z0-9-]', '', safe_name)
    fname = f"assets/images/exhibitions/{safe_name}.jpg"
    
    if os.path.exists(fname):
        return f'<div class="exhibition-card-image">\n          <img src="{fname}" alt="{alt_text}">\n        </div>'
    return m.group(0)

new_content = re.sub(pattern, repler, content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)
    
print("Updated index.html")
