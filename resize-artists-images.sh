#!/usr/bin/env bash
# Generate web-sized "-sml" copies of every image in assets/images/artists/.
# Caps the longest side at $MAX px using macOS `sips`. Idempotent: skips
# files already named *-sml.* and skips when the -sml output already exists.
#
# Usage: ./resize-artists-images.sh [max-pixels]   (default 1200)

set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)/assets/images/artists"
MAX="${1:-1200}"

if [[ ! -d "$DIR" ]]; then
  echo "error: $DIR not found" >&2
  exit 1
fi

shopt -s nullglob
created=0; existed=0; skipped=0

for f in "$DIR"/*.jpg "$DIR"/*.jpeg "$DIR"/*.png "$DIR"/*.JPG "$DIR"/*.JPEG "$DIR"/*.PNG; do
  base="$(basename "$f")"
  name="${base%.*}"
  ext="${base##*.}"

  if [[ "$name" == *-sml ]]; then
    skipped=$((skipped+1))
    continue
  fi

  out="$DIR/${name}-sml.${ext}"
  if [[ -f "$out" ]]; then
    existed=$((existed+1))
    continue
  fi

  cp "$f" "$out"
  sips --resampleHeightWidthMax "$MAX" "$out" >/dev/null
  created=$((created+1))
  printf '  resized: %s\n' "$base"
done

printf 'Done. Created %d, already existed %d, skipped (-sml source) %d.\n' \
  "$created" "$existed" "$skipped"
