import urllib.request
import re
import os
import ssl

ssl._create_default_https_context = ssl._create_unverified_context
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

urls = [
    'https://www.artsy.net/partner/mark-hachem-gallery/articles',
    'https://www.artsy.net/partner/mark-hachem-gallery/shows'
]

img_urls = set()
for url in urls:
    req = urllib.request.Request(url, headers=headers)
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        links = re.findall(r'https://[^"]+\.cloudfront\.net/[^"]+\.jpg', html)
        links += re.findall(r'https://[^"]+\.net/[^"]+\.jpg', html)
        for link in links:
            if "larger.jpg" in link or "medium.jpg" in link or "large.jpg" in link:
                img_urls.add(link)
    except Exception as e:
        print(f"Error fetching {url}: {e}")

print(f"Found {len(img_urls)} potential images.")

os.makedirs('assets/images/downloaded', exist_ok=True)
count = 1
for url in list(img_urls):
    if count > 25:
        break
    try:
        req = urllib.request.Request(url, headers=headers)
        data = urllib.request.urlopen(req).read()
        fname = f"assets/images/downloaded/img_{count}.jpg"
        with open(fname, 'wb') as f:
            f.write(data)
        print(f"Downloaded {fname}")
        count += 1
    except Exception as e:
        print(f"Failed {url}: {e}")
