#!/usr/bin/env python3
"""Fetch artist bios from detail pages and update YAML."""

import os
import re
import time
import urllib.request
import yaml
from html import unescape

WB_BASE = "https://web.archive.org/web/20260211174650"
YAML_PATH = "/Volumes/dev/mark-hachem-gallery/data/artists.yaml"
IMG_DIR = "/Volumes/dev/mark-hachem-gallery/assets/images/artists"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

ARTIST_SLUGS = {
    'Agenore Fabbri': 'Agenore-Fabbri', 'Alfred Basbous': 'Alfred-Basbous',
    'Antonio Asis': 'Antonio-Asis', 'Arman': 'Arman',
    'Carlos Cruz Diez': 'Carlos-Cruz-Diez', 'César Andrade': 'Cesar-Andrade',
    'CLAUDE GILLI': 'CLAUDE-GILLI', 'Dario Perez-Flores': 'Dario-Perez-Flores',
    'Dia Azzawi': 'Dia-Azzawi', 'Franco Adami': 'Franco-Adami',
    'Hamed ABDALLA': 'Hamed-ABDALLA', 'Helen Khal': 'Helen-Khal',
    'Hussein Madi': 'Hussein-Madi', 'Jesus-Rafael Soto': 'Jesus-Rafael-Soto',
    'Leila Nseir': 'Leila-Nseir', 'Marino Di Teana': 'MARINO-DI-TEANA',
    'Philippe Hiquily': 'Philippe-Hiquily', 'Rafael Barrios': 'Rafael-Barrios',
    'Roberto Matta': 'Roberto-Matta', 'Victor Vasarely': 'Victor-Vasarely',
    'Ahmad Moualla': 'Ahmad-Moualla', 'Alois Kronschlaeger': 'Alois-Kronschlaeger',
    'Anibal Vallejo': 'Anibal-Vallejo', 'Athier Mousawi': 'Athier-Mousawi',
    'Ben Abou Nassif': 'Ben-Abou-Nassif', 'Chaouki Chamoun': 'Chaouki-Chamoun',
    'Fatima El Hajj': 'Fatima-El-Hajj', 'Ghazi Baker': 'Ghazi-Baker',
    'Giselle Borras': 'Giselle-Borras', 'JAMES CHEDBURN': 'JAMES-CHEDBURN',
    'Jose Margulis': 'Jose-Margulis', 'Julio Le Parc': 'Julio-LeParc',
    'Laila Shawa': 'Laila-Shawa', 'Léo Caillard': 'Leo-Caillard',
    'Marck': 'Marck', 'Mathias Schmied': 'Mathias-Schmied',
    'Mauro Corda': 'Mauro-Corda', 'Maysaloun Faraj': 'Maysaloun-Faraj',
    'Michelangelo Bastiani': 'Michelangelo-Bastiani', 'Missak Terzian': 'Missak-Terzian',
    'Nadim Karam': 'Nadim-Karam', 'Nedim Kufi': 'Kufi-Nedim',
    'Polles': 'Polles', 'Raffi Yedalian': 'Raffi-YEDALIAN',
    'Sara Shamma': 'Sara-Shamma', 'Shawn Smith': 'Shawn-Smith',
    'Stephen Peirce': 'Stephen-Peirce', 'Victor Ekpuk': 'Victor-Ekpuk',
    'WOLFGANG STILLER': 'WOLFGANG-STILLER', 'Yasmina Nysten': 'Yasmina-Nysten',
    'YOSHIYUKI MIURA': 'YOSHIYUKI-MIURA', 'Yves Hayat': 'Yves-Hayat',
    'Yves ULLENS': 'Yves-ULLENS',
}


def fetch_page(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def extract_bio(html):
    """Extract bio from artist detail page."""
    subtitle = None

    # Find "Born in YEAR" pattern for subtitle
    born_match = re.search(r'Born in (\d{4}[^<\n]{0,50})', html)
    if born_match:
        subtitle = f"Born in {born_match.group(1).strip()}"

    # Strategy: find the bio section by looking for known markers
    # The bio typically appears after "EN" header and before "DOWNLOAD" or "Exhibitions"
    # It's in <p class="BodyA"> or <p class="MsoNormal"> tags

    # Extract the section between the artwork area and the exhibitions/download section
    # Look for content after EN marker
    en_match = re.search(r'<h4[^>]*>\s*<b[^>]*>\s*<span[^>]*>EN</span>', html)
    if not en_match:
        # Try alternative: just find the first paragraph with substantial text after "Born in"
        en_match = re.search(r'Born in \d{4}', html)

    if not en_match:
        return subtitle, None

    start_pos = en_match.end()

    # Find end marker
    end_match = re.search(r'DOWNLOAD ARTIST BIOGRAPHY|<h4[^>]*>.*?Exhibitions|SOLO EXHIBITIONS|GROUP EXHIBITIONS', html[start_pos:])
    end_pos = start_pos + end_match.start() if end_match else start_pos + 5000

    section = html[start_pos:end_pos]

    # Remove HTML tags but preserve paragraph breaks
    # Replace block-level tags with newlines
    section = re.sub(r'<(?:p|div|h[1-6]|br)[^>]*>', '\n', section)
    section = re.sub(r'<[^>]+>', '', section)
    section = unescape(section)

    # Clean up whitespace
    lines = section.split('\n')
    paragraphs = []
    current = []

    for line in lines:
        line = line.strip()
        if not line or line == '\xa0':
            if current:
                p = ' '.join(current)
                if len(p) > 50:
                    paragraphs.append(p)
                current = []
        else:
            # Skip junk
            if line in ('EN', 'FR', 'AR', '\xa0') or len(line) < 3:
                continue
            current.append(line)

    if current:
        p = ' '.join(current)
        if len(p) > 50:
            paragraphs.append(p)

    if not paragraphs:
        return subtitle, None

    bio = '\n\n'.join(paragraphs[:5])

    # Clean up any remaining artifacts
    bio = re.sub(r'\s{2,}', ' ', bio)
    bio = bio.strip()

    return subtitle, bio if len(bio) > 50 else None


def slugify(text):
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text[:80].strip('-')


def main():
    with open(YAML_PATH) as f:
        artists = yaml.safe_load(f)

    # Fix missing image paths
    for a in artists:
        slug = slugify(a['name'])
        if not a.get('image'):
            for ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
                fp = os.path.join(IMG_DIR, f"{slug}.{ext}")
                if os.path.exists(fp) and os.path.getsize(fp) > 0:
                    a['image'] = f"assets/images/artists/{slug}.{ext}"
                    print(f"Fixed image: {a['name']} -> {slug}.{ext}")
                    break

    updated = 0
    errors = 0

    for i, artist in enumerate(artists):
        if artist.get('bio'):
            continue

        name = artist['name']
        slug = ARTIST_SLUGS.get(name)
        if not slug:
            continue

        url = f"{WB_BASE}/http://www.markhachem.com/index.php/{slug}.html"
        print(f"[{i+1}/53] {name}...", end=' ')

        try:
            html = fetch_page(url)
            subtitle, bio = extract_bio(html)
            if subtitle and not artist.get('subtitle'):
                artist['subtitle'] = subtitle
            if bio:
                artist['bio'] = bio
                updated += 1
                print(f"OK ({len(bio)} chars)")
            else:
                print("no bio")
        except Exception as e:
            errors += 1
            print(f"error: {e}")

        time.sleep(2)

    with open(YAML_PATH, 'w', encoding='utf-8') as f:
        yaml.dump(artists, f, default_flow_style=False, allow_unicode=True, sort_keys=False, width=120)

    total_bios = sum(1 for a in artists if a.get('bio'))
    total_images = sum(1 for a in artists if a.get('image'))
    print(f"\nUpdated {updated} bios, {errors} errors")
    print(f"Bios: {total_bios}/53, Images: {total_images}/53")


if __name__ == "__main__":
    main()
