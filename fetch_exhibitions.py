#!/usr/bin/env python3
"""Fetch past exhibitions from Wayback Machine and build YAML + download images."""

import os
import re
import time
import urllib.request
import urllib.parse
import yaml
import hashlib
from html.parser import HTMLParser
from html import unescape

BASE_WB = "https://web.archive.org/web/20260211174650"
PAGES = [
    f"{BASE_WB}/http://www.markhachem.com/exhibitions/exhibitions-previous.html",
    f"{BASE_WB}/http://www.markhachem.com/index.php/exhibitionspreviouss?lang=en&limit=20&limitstart=20",
    f"{BASE_WB}/http://www.markhachem.com/index.php/exhibitionspreviouss?lang=en&limit=20&limitstart=40",
    f"{BASE_WB}/http://www.markhachem.com/index.php/exhibitionspreviouss?lang=en&limit=20&limitstart=60",
    f"{BASE_WB}/http://www.markhachem.com/index.php/exhibitionspreviouss?lang=en&limit=20&limitstart=80",
    f"{BASE_WB}/http://www.markhachem.com/index.php/exhibitionspreviouss?lang=en&limit=20&limitstart=100",
]

IMG_DIR = "/Volumes/dev/mark-hachem-gallery/assets/images/exhibitions"
YAML_PATH = "/Volumes/dev/mark-hachem-gallery/data/exhibitions.yaml"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def fetch_page(url):
    """Fetch a page from the Wayback Machine."""
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def parse_exhibitions(html):
    """Parse exhibition entries from the HTML."""
    exhibitions = []

    # Split by table rows
    rows = re.split(r'<tr class="row[01]">', html)

    for row in rows[1:]:  # skip first empty split
        exh = {}

        # Extract image URL
        img_match = re.search(r'<img src="([^"]+)"', row)
        if img_match:
            exh["image_url"] = img_match.group(1)

        # Extract city/region
        city_match = re.search(r'<p class="year-right">([^<]*)</p>', row)
        if city_match:
            exh["city"] = unescape(city_match.group(1).strip())

        # Extract title
        title_match = re.search(r'<h3>([^<]*(?:<[^>]+>[^<]*)*)</h3>', row)
        if title_match:
            title = re.sub(r'<[^>]+>', '', title_match.group(1))
            exh["title"] = unescape(title.strip())

        # Extract date info - text between <p><br/> and </p> after h3
        date_match = re.search(r'<h3>.*?</h3>\s*<p>([^<]*(?:<br\s*/?>)?[^<]*)</p>', row, re.DOTALL)
        if date_match:
            date_text = re.sub(r'<[^>]+>', '', date_match.group(1)).strip()
            exh["dates"] = unescape(date_text)

        # Extract location
        loc_match = re.search(r'<p>Location:\s*\n?([^<]+)</p>', row)
        if loc_match:
            exh["location"] = unescape(loc_match.group(1).strip())

        # Extract description
        desc_match = re.search(r'class="robo-font">([^<]+(?:<[^>]+>[^<]*)*)</p>', row, re.DOTALL)
        if desc_match:
            desc = re.sub(r'<[^>]+>', '', desc_match.group(1)).strip()
            desc = unescape(desc)
            if desc:
                exh["description"] = desc

        # Extract PDF link
        pdf_match = re.search(r'<a class="pdf-file" href="([^"]+)"', row)
        if pdf_match:
            exh["pdf_url"] = pdf_match.group(1)

        if exh.get("title"):
            exhibitions.append(exh)

    return exhibitions


def slugify(text):
    """Create a filesystem-safe slug from text."""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text[:80].strip('-')


def download_image(url, slug):
    """Download image and return local filename."""
    # Get extension from URL
    parsed = urllib.parse.urlparse(url)
    path = parsed.path
    ext_match = re.search(r'\.(\w{3,4})$', path.split('/')[-1].lower())
    ext = ext_match.group(1) if ext_match else 'jpg'
    if ext not in ('jpg', 'jpeg', 'png', 'gif', 'webp'):
        ext = 'jpg'

    filename = f"{slug}.{ext}"
    filepath = os.path.join(IMG_DIR, filename)

    if os.path.exists(filepath):
        print(f"  [skip] {filename} already exists")
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

    all_exhibitions = []

    for i, page_url in enumerate(PAGES):
        print(f"\n--- Fetching page {i+1}/6 ---")
        try:
            html = fetch_page(page_url)
            exhibitions = parse_exhibitions(html)
            print(f"  Found {len(exhibitions)} exhibitions")
            all_exhibitions.extend(exhibitions)
        except Exception as e:
            print(f"  Error fetching page {i+1}: {e}")
        time.sleep(1)  # be polite to archive.org

    print(f"\n=== Total exhibitions found: {len(all_exhibitions)} ===\n")

    # Download images and build final data
    yaml_data = []
    for idx, exh in enumerate(all_exhibitions):
        slug = slugify(exh.get("title", f"exhibition-{idx}"))

        # Download image
        image_file = None
        if exh.get("image_url"):
            print(f"[{idx+1}/{len(all_exhibitions)}] Downloading: {exh['title'][:60]}")
            image_file = download_image(exh["image_url"], slug)
            time.sleep(0.5)  # be polite

        entry = {
            "title": exh.get("title", ""),
            "city": exh.get("city", ""),
            "dates": exh.get("dates", ""),
        }
        if exh.get("location"):
            entry["location"] = exh["location"]
        if exh.get("description"):
            entry["description"] = exh["description"]
        if image_file:
            entry["image"] = f"assets/images/exhibitions/{image_file}"
        if exh.get("pdf_url"):
            entry["pdf_url"] = exh["pdf_url"]

        yaml_data.append(entry)

    # Write YAML
    with open(YAML_PATH, 'w', encoding='utf-8') as f:
        yaml.dump(yaml_data, f, default_flow_style=False, allow_unicode=True, sort_keys=False, width=120)

    print(f"\n=== Done! YAML written to {YAML_PATH} ===")
    print(f"=== {len(yaml_data)} exhibitions cataloged ===")
    print(f"=== Images saved to {IMG_DIR} ===")


if __name__ == "__main__":
    main()
