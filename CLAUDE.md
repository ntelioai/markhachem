# Mark Hachem Gallery — Website

Static marketing site for Mark Hachem Gallery (kinetic art, Arab modernism, contemporary art).
Founded in Paris, 1996. Physical locations in Paris, New York, and Beirut.

## Stack

- Plain HTML/CSS/JS — no framework, no build step.
- Styles and scripts are inlined in each page's `<style>` and `<script>` blocks.
- Deployed via Cloudflare (see `wrangler.toml`). Assets directory is `./public`.
- Python scripts (`fetch_*.py`, `download_*.py`, `retry_*.py`) are one-off data/image
  scraping tools used during initial build — not part of the runtime.

## Pages

- `index.html` — home page (hero, now-showing, about, past exhibitions, collection, contact, footer)
- `artists.html` — artist roster
- `exhibitions.html` — full exhibitions archive
- `mentions-legales.html` — legal notices (French)

## Gallery contact facts

- **Paris**: 28 Place des Vosges, 75003 AND 44 Rue des Tournelles, 75004 — +33 (0)1 42 76 94 93 — paris@markhachem.com
- **WhatsApp**: +33 6 09 18 27 11 (floating button on index.html)
- **Founded**: 1996 in Le Marais, Paris. NY expansion 2007, Beirut 2010.

## Editing conventions

- Edit HTML directly. No templating.
- Keep inline styles/scripts inline — don't extract to external files unless asked.
- Structured data (JSON-LD) lives at the top of `index.html` — keep it in sync with
  visible contact info when addresses/phones change.
- Preserve existing class names and reveal/animation hooks (`.reveal`, `.reveal-delay-*`).
