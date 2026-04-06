#!/usr/bin/env python3
"""Download hi-res artist images from Artsy CDN and update YAML + HTML."""

import json, os, re, time, struct
import urllib.request
import yaml

ARTSY_JSON = "/tmp/artsy_artists.json"
YAML_PATH = "data/artists.yaml"
IMG_DIR = "assets/images/artists"

# Manual name mappings for artists whose names differ between our YAML and Artsy
NAME_OVERRIDES = {
    "carlos cruz diez": "carlos cruz-diez",
    "jesus-rafael soto": "jesús rafael soto",
    "dario perez-flores": "dario pérez-flores",
    "ben abou nassif": "ben abounassif",
    "chaouki chamoun": "chamoun chaouki",
    "jose margulis": "j. margulis",
    "nedim kufi": "nedim al-kufi",
    "yasmina nysten": "yasmina alexandra nysten",
    "giselle borras": "giselle borrás",
}


def normalize(name):
    return re.sub(r'[^a-z\s]', '', name.lower()).strip()


def slugify(text):
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text[:80].strip('-')


def get_image_dimensions(filepath):
    try:
        with open(filepath, 'rb') as f:
            header = f.read(2)
            if header == b'\xff\xd8':  # JPEG
                f.seek(2)
                while True:
                    marker, = struct.unpack('>H', f.read(2))
                    if marker in (0xFFC0, 0xFFC2):
                        f.read(3)
                        h, w = struct.unpack('>HH', f.read(4))
                        return w, h
                    else:
                        length, = struct.unpack('>H', f.read(2))
                        f.read(length - 2)
            elif header == b'\x89P':  # PNG
                f.seek(16)
                w, h = struct.unpack('>II', f.read(8))
                return w, h
    except:
        pass
    return None, None


def main():
    # Load Artsy data
    with open(ARTSY_JSON) as f:
        artsy_all = json.load(f)

    # Build lookup
    artsy_lookup = {}
    for a in artsy_all:
        artsy_lookup[normalize(a["name"])] = a

    # Load our YAML
    with open(YAML_PATH) as f:
        artists = yaml.safe_load(f)

    updated = 0
    failed = 0
    skipped = 0
    old_files_to_delete = []

    for i, artist in enumerate(artists):
        name = artist["name"]
        our_slug = slugify(name)

        # Find on Artsy
        key = normalize(name)
        override_key = NAME_OVERRIDES.get(key)
        match = artsy_lookup.get(key)
        if not match and override_key:
            match = artsy_lookup.get(normalize(override_key))
        if not match:
            # Fuzzy: try partial matches
            for akey, aval in artsy_lookup.items():
                if key in akey or akey in key:
                    match = aval
                    break

        if not match or not match.get("imageUrl"):
            print(f"[{i+1}/53] {name:30s} -> NO ARTSY IMAGE")
            skipped += 1
            continue

        img_base = match["imageUrl"].rsplit("/", 1)[0]
        large_url = f"{img_base}/large.jpg"
        new_filename = f"{our_slug}.jpg"
        new_filepath = os.path.join(IMG_DIR, new_filename)

        # Check if old file exists with different extension
        old_image = artist.get("image", "")
        old_filepath = old_image if not old_image.startswith("assets/") else old_image
        old_ext = os.path.splitext(old_filepath)[1] if old_filepath else ""

        print(f"[{i+1}/53] {name:30s}", end=" ")

        try:
            req = urllib.request.Request(large_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()

            with open(new_filepath, 'wb') as f:
                f.write(data)

            new_path = f"assets/images/artists/{new_filename}"

            # Track old files to delete if extension changed
            if old_image and old_image != new_path:
                old_full = old_image
                if os.path.exists(old_full) and old_full != new_filepath:
                    old_files_to_delete.append(old_full)

            artist["image"] = new_path
            updated += 1
            print(f"OK ({len(data)/1024:.0f}KB)")

        except Exception as e:
            failed += 1
            print(f"ERROR: {e}")

        time.sleep(0.3)

    # Save YAML
    with open(YAML_PATH, 'w', encoding='utf-8') as f:
        yaml.dump(artists, f, default_flow_style=False, allow_unicode=True, sort_keys=False, width=120)

    # Delete old files
    for old_file in old_files_to_delete:
        if os.path.exists(old_file):
            os.remove(old_file)
            print(f"Deleted old: {old_file}")

    print(f"\n=== Summary ===")
    print(f"Updated: {updated}")
    print(f"Failed: {failed}")
    print(f"No Artsy image: {skipped}")
    print(f"Old files deleted: {len(old_files_to_delete)}")


if __name__ == "__main__":
    main()
