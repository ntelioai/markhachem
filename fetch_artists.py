#!/usr/bin/env python3
"""Fetch artist data from Wayback Machine and build YAML + download images."""

import os
import re
import time
import urllib.request
import urllib.parse
import yaml
from html import unescape

WB_BASE = "https://web.archive.org/web/20260211174650"
MODERN_URL = f"{WB_BASE}/http://www.markhachem.com/index.php/modern.html"
CONTEMPORARY_URL = f"{WB_BASE}/http://www.markhachem.com/index.php/contemporary.html"

IMG_DIR = "/Volumes/dev/mark-hachem-gallery/assets/images/artists"
YAML_PATH = "/Volumes/dev/mark-hachem-gallery/data/artists.yaml"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def fetch_page(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def parse_artist_list(html):
    """Extract artists from listing page."""
    artists = []
    # Pattern: <a href="URL"><img ... src="IMG_URL"> <h3><a href="URL">Name</h3>
    pattern = r'<a href="([^"]*)"[^>]*><img alt="Logo"[^>]*src="([^"]*)"[^>]*>\s*<h3><a href="[^"]*">([^<]*)</h3>'
    matches = re.findall(pattern, html, re.DOTALL)
    for detail_url, thumb_url, name in matches:
        artists.append({
            'name': unescape(name.strip()),
            'detail_url': detail_url,
            'thumb_url': thumb_url,
        })
    return artists


def parse_artist_detail(html, name):
    """Extract bio, larger image, nationality from artist detail page."""
    info = {}

    # Try to find a larger/main image
    # Look for images in the artist content area
    img_matches = re.findall(r'<img[^>]*src="([^"]*)"[^>]*>', html)
    for img_url in img_matches:
        if 'com_jeartists' in img_url and 'thumb2_' not in img_url:
            info['main_image'] = img_url
            break
        elif 'com_jeartists' in img_url and 'thumb2_' in img_url and 'main_image' not in info:
            # Use the first jeartists image as fallback
            info['main_image'] = img_url

    # Look for artist profile images (larger ones)
    for img_url in img_matches:
        if '/images/' in img_url and name.lower().replace(' ', '') in img_url.lower().replace(' ', ''):
            info['main_image'] = img_url
            break

    # Try to get bio text - look for paragraphs in the main content
    # The detail page typically has the bio in the component area
    content_match = re.search(r'<div class="vt_component">(.*?)</main>', html, re.DOTALL)
    if content_match:
        content = content_match.group(1)
        # Remove HTML tags but keep paragraph breaks
        # First get all paragraph text
        paragraphs = re.findall(r'<p[^>]*>(.*?)</p>', content, re.DOTALL)
        bio_parts = []
        for p in paragraphs:
            text = re.sub(r'<[^>]+>', '', p).strip()
            text = unescape(text)
            if text and len(text) > 20 and not text.startswith('http'):
                bio_parts.append(text)

        if bio_parts:
            info['bio'] = '\n\n'.join(bio_parts[:5])  # Limit to first 5 paragraphs

    # Try to find nationality/dates
    # Often in format "Country, b. YEAR" or "Country, YEAR-YEAR"
    text_content = re.sub(r'<[^>]+>', ' ', html)
    nat_match = re.search(rf'{re.escape(name)}[^.]*?(\([^)]+\))', text_content)
    if nat_match:
        info['subtitle'] = nat_match.group(1).strip('()')

    return info


def slugify(text):
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text[:80].strip('-')


def download_image(url, slug):
    """Download image and return local filename."""
    url = url.replace(' ', '%20')
    parsed = urllib.parse.urlparse(url)
    path = parsed.path
    ext_match = re.search(r'\.(\w{3,4})$', path.split('/')[-1].lower())
    ext = ext_match.group(1) if ext_match else 'jpg'
    if ext not in ('jpg', 'jpeg', 'png', 'gif', 'webp'):
        ext = 'jpg'

    filename = f"{slug}.{ext}"
    filepath = os.path.join(IMG_DIR, filename)

    if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
        print(f"  [skip] {filename}")
        return filename

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
    os.makedirs(IMG_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(YAML_PATH), exist_ok=True)

    # Fetch listing pages
    print("=== Fetching Modern artists ===")
    modern_html = fetch_page(MODERN_URL)
    modern_artists = parse_artist_list(modern_html)
    print(f"  Found {len(modern_artists)} modern artists")

    time.sleep(2)

    print("\n=== Fetching Contemporary artists ===")
    contemporary_html = fetch_page(CONTEMPORARY_URL)
    contemporary_artists = parse_artist_list(contemporary_html)
    print(f"  Found {len(contemporary_artists)} contemporary artists")

    # Tag categories
    for a in modern_artists:
        a['category'] = 'Modern'
    for a in contemporary_artists:
        a['category'] = 'Contemporary'

    all_artists = modern_artists + contemporary_artists

    # Fetch detail pages for bios
    print(f"\n=== Fetching {len(all_artists)} artist detail pages ===")
    for i, artist in enumerate(all_artists):
        detail_url = artist['detail_url']
        # Convert to wayback URL
        if detail_url.startswith('/web/'):
            wb_url = f"https://web.archive.org{detail_url}"
        elif detail_url.startswith('http'):
            wb_url = detail_url
        else:
            wb_url = f"{WB_BASE}{detail_url}"

        print(f"[{i+1}/{len(all_artists)}] {artist['name']}")
        try:
            detail_html = fetch_page(wb_url)
            info = parse_artist_detail(detail_html, artist['name'])
            artist.update(info)
        except Exception as e:
            print(f"  [error fetching detail] {e}")
        time.sleep(1.5)

    # Download images
    print(f"\n=== Downloading images ===")
    yaml_data = []
    for i, artist in enumerate(all_artists):
        slug = slugify(artist['name'])
        print(f"[{i+1}/{len(all_artists)}] {artist['name']}")

        # Try main image first, fall back to thumbnail
        image_url = artist.get('main_image') or artist.get('thumb_url')
        image_file = None
        if image_url:
            image_file = download_image(image_url, slug)
            time.sleep(0.5)

        # If main image failed, try thumbnail
        if not image_file and artist.get('thumb_url') and artist.get('thumb_url') != image_url:
            print(f"  Trying thumbnail...")
            image_file = download_image(artist['thumb_url'], slug)
            time.sleep(0.5)

        entry = {
            'name': artist['name'],
            'category': artist['category'],
        }
        if artist.get('subtitle'):
            entry['subtitle'] = artist['subtitle']
        if artist.get('bio'):
            entry['bio'] = artist['bio']
        if image_file:
            entry['image'] = f"assets/images/artists/{image_file}"

        yaml_data.append(entry)

    # Write YAML
    with open(YAML_PATH, 'w', encoding='utf-8') as f:
        yaml.dump(yaml_data, f, default_flow_style=False, allow_unicode=True, sort_keys=False, width=120)

    print(f"\n=== Done! ===")
    print(f"YAML: {YAML_PATH} ({len(yaml_data)} artists)")
    print(f"Images: {IMG_DIR}")

    with_images = sum(1 for a in yaml_data if a.get('image'))
    with_bios = sum(1 for a in yaml_data if a.get('bio'))
    print(f"With images: {with_images}")
    print(f"With bios: {with_bios}")


if __name__ == "__main__":
    main()
