import re
import json

with open('shows.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Look for relay bootstrap
match = re.search(r'id="__RELAY_BOOTSTRAP__"[^>]*>(.*?)</script>', html, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    print("Found relay payload")
    
    # Try looking for show names
    extracted_shows = {}
    
    # Deep search helper
    def search_dict(node):
        if isinstance(node, dict):
            if 'name' in node and 'image' in node:
                img = node['image']
                if img and 'url' in node['image']:
                    extracted_shows[node['name']] = node['image']['url']
            for k, v in node.items():
                search_dict(v)
        elif isinstance(node, list):
            for i in node:
                search_dict(i)
                
    search_dict(data)
    
    print(f"Extracted {len(extracted_shows)} shows")
    for k, v in extracted_shows.items():
        print(f" - {k}: {v}")
else:
    print("No relay payload found, trying next data block")
    
    # Another common artsy block
    match = re.search(r'window\.__APOLLO_STATE__\s*=\s*({.*?});', html, re.DOTALL)
    if match:
        data = json.loads(match.group(1))
        shows = 0
        for k, v in data.items():
            if 'Show:' in k or 'name' in v:
                name = v.get('name')
                # get coverImage
                if 'coverImage' in v and v['coverImage']:
                    ref = v['coverImage'].get('__ref')
                    if ref and ref in data:
                        img = data[ref]
                        url = img.get('url') or img.get('imageURL')
                        if name and url:
                            print(f"{name}: {url}")
                            shows += 1
        print(f"Apollo found {shows} shows")
