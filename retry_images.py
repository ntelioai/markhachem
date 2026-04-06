#!/usr/bin/env python3
"""Retry downloading failed exhibition images with longer delays."""

import os
import re
import time
import urllib.request
import urllib.parse
import yaml

IMG_DIR = "/Volumes/dev/mark-hachem-gallery/assets/images/exhibitions"
YAML_PATH = "/Volumes/dev/mark-hachem-gallery/data/exhibitions.yaml"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Load YAML and re-fetch from pages to get image URLs
# Instead, let me just re-fetch the pages and find missing images
BASE_WB = "https://web.archive.org/web/20260211174650"
PAGES = [
    f"{BASE_WB}/http://www.markhachem.com/exhibitions/exhibitions-previous.html",
    f"{BASE_WB}/http://www.markhachem.com/index.php/exhibitionspreviouss?lang=en&limit=20&limitstart=20",
    f"{BASE_WB}/http://www.markhachem.com/index.php/exhibitionspreviouss?lang=en&limit=20&limitstart=40",
    f"{BASE_WB}/http://www.markhachem.com/index.php/exhibitionspreviouss?lang=en&limit=20&limitstart=60",
    f"{BASE_WB}/http://www.markhachem.com/index.php/exhibitionspreviouss?lang=en&limit=20&limitstart=80",
    f"{BASE_WB}/http://www.markhachem.com/index.php/exhibitionspreviouss?lang=en&limit=20&limitstart=100",
]


def slugify(text):
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text[:80].strip('-')


def download_image(url, slug, attempt=1):
    parsed = urllib.parse.urlparse(url)
    path = parsed.path
    ext_match = re.search(r'\.(\w{3,4})$', path.split('/')[-1].lower())
    ext = ext_match.group(1) if ext_match else 'jpg'
    if ext not in ('jpg', 'jpeg', 'png', 'gif', 'webp'):
        ext = 'jpg'
    filename = f"{slug}.{ext}"
    filepath = os.path.join(IMG_DIR, filename)

    if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
        return filename

    # Fix URLs with spaces by encoding them
    url = url.replace(' ', '%20')

    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
            with open(filepath, 'wb') as f:
                f.write(data)
        print(f"  [ok] {filename} ({len(data)} bytes)")
        return filename
    except Exception as e:
        print(f"  [error] {filename}: {e}")
        return None


def main():
    with open(YAML_PATH, 'r') as f:
        exhibitions = yaml.safe_load(f)

    # Get all image URLs from pages
    from html import unescape
    all_entries = []

    for i, page_url in enumerate(PAGES):
        print(f"Fetching page {i+1}...")
        req = urllib.request.Request(page_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as resp:
            html = resp.read().decode('utf-8', errors='replace')

        rows = re.split(r'<tr class="row[01]">', html)
        for row in rows[1:]:
            img_match = re.search(r'<img src="([^"]+)"', row)
            title_match = re.search(r'<h3>([^<]*(?:<[^>]+>[^<]*)*)</h3>', row)
            if title_match:
                title = re.sub(r'<[^>]+>', '', title_match.group(1))
                title = unescape(title.strip())
                img_url = img_match.group(1) if img_match else None
                all_entries.append((title, img_url))
        time.sleep(2)

    # Now retry failed downloads
    success = 0
    failed = 0
    skipped = 0

    for title, img_url in all_entries:
        if not img_url:
            continue
        slug = slugify(title)
        # Check all possible extensions
        exists = False
        for ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
            if os.path.exists(os.path.join(IMG_DIR, f"{slug}.{ext}")) and os.path.getsize(os.path.join(IMG_DIR, f"{slug}.{ext}")) > 0:
                exists = True
                break

        if exists:
            skipped += 1
            continue

        print(f"Retrying: {title[:60]}")
        result = download_image(img_url, slug)
        if result:
            success += 1
            # Update YAML entry
            for exh in exhibitions:
                if exh.get('title') == title and not exh.get('image'):
                    exh['image'] = f"assets/images/exhibitions/{result}"
                    break
        else:
            failed += 1
        time.sleep(3)  # longer delay

    # Save updated YAML
    with open(YAML_PATH, 'w', encoding='utf-8') as f:
        yaml.dump(exhibitions, f, default_flow_style=False, allow_unicode=True, sort_keys=False, width=120)

    print(f"\nRetry complete: {success} new downloads, {failed} still failed, {skipped} already existed")


if __name__ == "__main__":
    main()
