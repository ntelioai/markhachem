#!/usr/bin/env python3
"""Retry downloading failed artist images."""

import os
import re
import time
import urllib.request
import urllib.parse
import yaml

IMG_DIR = "/Volumes/dev/mark-hachem-gallery/assets/images/artists"
YAML_PATH = "/Volumes/dev/mark-hachem-gallery/data/artists.yaml"
WB_BASE = "https://web.archive.org/web/20260211174650"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def slugify(text):
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text[:80].strip('-')


def download_image(url, filepath):
    url = url.replace(' ', '%20')
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
            with open(filepath, 'wb') as f:
                f.write(data)
        print(f"  [ok] {os.path.basename(filepath)} ({len(data)} bytes)")
        return True
    except Exception as e:
        print(f"  [error] {os.path.basename(filepath)}: {e}")
        return False


def main():
    # Refetch listing pages to get image URLs
    print("Fetching listing pages...")
    modern_html = urllib.request.urlopen(
        urllib.request.Request(f"{WB_BASE}/http://www.markhachem.com/index.php/modern.html", headers=HEADERS),
        timeout=30
    ).read().decode('utf-8', errors='replace')
    time.sleep(3)

    contemp_html = urllib.request.urlopen(
        urllib.request.Request(f"{WB_BASE}/http://www.markhachem.com/index.php/contemporary.html", headers=HEADERS),
        timeout=30
    ).read().decode('utf-8', errors='replace')

    # Extract all thumbnail URLs
    pattern = r'<a href="([^"]*)"[^>]*><img alt="Logo"[^>]*src="([^"]*)"[^>]*>\s*<h3><a href="[^"]*">([^<]*)</h3>'

    all_entries = []
    for html in [modern_html, contemp_html]:
        matches = re.findall(pattern, html, re.DOTALL)
        for detail_url, thumb_url, name in matches:
            all_entries.append((name.strip(), thumb_url, detail_url))

    with open(YAML_PATH) as f:
        artists = yaml.safe_load(f)

    success = 0
    failed = 0
    skipped = 0

    for name, thumb_url, detail_url in all_entries:
        slug = slugify(name)

        # Check if already exists
        exists = False
        for ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
            fp = os.path.join(IMG_DIR, f"{slug}.{ext}")
            if os.path.exists(fp) and os.path.getsize(fp) > 0:
                exists = True
                break

        if exists:
            skipped += 1
            continue

        print(f"Retrying: {name}")

        # Try thumbnail
        ext_match = re.search(r'\.(\w{3,4})$', thumb_url.split('/')[-1].lower())
        ext = ext_match.group(1) if ext_match else 'jpg'
        if ext not in ('jpg', 'jpeg', 'png', 'gif', 'webp'):
            ext = 'jpg'
        filepath = os.path.join(IMG_DIR, f"{slug}.{ext}")

        if download_image(thumb_url, filepath):
            success += 1
            # Update YAML
            for a in artists:
                if slugify(a['name']) == slug and not a.get('image'):
                    a['image'] = f"assets/images/artists/{slug}.{ext}"
                    break
        else:
            failed += 1

        time.sleep(4)

    with open(YAML_PATH, 'w', encoding='utf-8') as f:
        yaml.dump(artists, f, default_flow_style=False, allow_unicode=True, sort_keys=False, width=120)

    print(f"\nRetry: {success} new, {failed} failed, {skipped} existed")
    total_with_img = sum(1 for a in artists if a.get('image'))
    print(f"Total with images: {total_with_img}/{len(artists)}")


if __name__ == "__main__":
    main()
