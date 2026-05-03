# Website PRD — Mark Hachem Gallery

**Status:** Draft · written before the CMS port catches up to recent HTML changes
**Source of truth analysed:** `../mark-hachem-gallery/index.html` (940 lines, post customer edits)
**Goal of this doc:** define every section of the homepage, what content it shows, what should be editor-controlled (selectable / orderable), and which CMS model owns it. This becomes the spec the CMS implementation is rewritten against.

---

## Conventions

- **Selectable** — editor curates a subset from a larger pool (e.g. picking 12 artists out of 54).
- **Orderable** — display sequence matters and the editor controls it (vs. auto-sorted by date or name).
- **CMS source** — which existing collection / global the data lives in, or which new model is needed.
- **"Existing"** = already modelled in Payload as of this writing (Artists, Exhibitions, Media, Settings, Users).
- **"NEW"** = not modelled yet; needs to be added.

---

## Section index (in render order)

1. [Navigation](#1-navigation)
2. [Hero](#2-hero)
3. [Current Exhibition (Now Showing)](#3-current-exhibition-now-showing)
4. [Gallery Strip](#4-gallery-strip)
5. [Artists (homepage subset)](#5-artists-homepage-subset)
6. [About](#6-about)
7. [News](#7-news)
8. [Exhibitions Archive (Recent Exhibitions)](#8-exhibitions-archive-recent-exhibitions)
9. [Collection (Selected / Available Works)](#9-collection-selected--available-works)
10. [Latest — Current & Upcoming (fairs)](#10-latest--current--upcoming-fairs)
11. [Art Fairs (full grid)](#11-art-fairs-full-grid)
12. [Contact](#12-contact)
13. [Footer](#13-footer)
14. [Floating WhatsApp button](#14-floating-whatsapp-button)

---

## 1. Navigation

**What it shows.** Logo (white-on-hero, dark-on-scroll), 5 menu links (About, Artists, Exhibitions, Art Fairs, News), Contact CTA.

- **Selectable.** No.
- **Orderable.** Yes — order of menu items.
- **Editable fields.** Each menu entry: `label`, `href`, `externalTarget?`. Logo files stay as static assets (single brand asset).
- **CMS source.** Add a **Settings → Navigation** group: `links: array of { label, href, openInNewTab? }`.
- **Note.** "News" is now a top-level link, so the site needs a `/news` index route.

---

## 2. Hero

**What it shows.** Background image (with mobile srcset variant), kicker line ("Est. Paris, 1996"), big two-line title (`Mark` / `Hachem`), three-pillar tagline ("Kinetic Art · Modern Art · Contemporary Art").

- **Selectable.** Hero image (single, with mobile variant).
- **Orderable.** N/A.
- **Editable fields.** `heroImage`, `heroImageMobile`, `kicker`, `titleStrong` (the bold word), `titleRest` (the rest of the title), `taglinePillars: array of text` (3 entries).
- **CMS source.** **NEW: Homepage global** (or a Hero tab inside Settings). Currently hardcoded.

---

## 3. Current Exhibition (Now Showing)

**What it shows.** A single featured exhibition: cover image, "On View — Paris Gallery" line, two-line title, artist names line, blurb paragraph, "View Exhibition" CTA.

- **Selectable.** Yes — exactly one exhibition from the existing collection.
- **Orderable.** N/A (singular).
- **Editable fields used.** `coverImage`, `displayDates` (or rendered "On View — {location}" line), `title` (allow optional `<br>` mid-title), `artists` relation rendered as comma list, `description` (rich text → ~3-line plain blurb), `ctaUrl`.
- **CMS source.** **Existing:** Exhibitions collection. Toggle `isNowShowing` on one record to drive this section. **Already wired in the current CMS port.**
- **Gap.** Title has a hand-placed `<br>` ("Chromatic / Territories"). Decide between two options:
  - Add `titleLine1` + `titleLine2` fields, OR
  - Render whatever the editor types as a single line and drop the visual two-liner.

---

## 4. Gallery Strip

**What it shows.** Horizontal infinite-scroll of **15 gallery photos** (`assets/images/gallery-strip/gallery-photo-01..15.jpeg`). DOM duplicates the set for the seamless loop.

- **Selectable.** Yes — the editor picks the photos in the strip.
- **Orderable.** Yes — left-to-right reading order matters for visual rhythm.
- **Editable fields per item.** `image` upload + `alt`.
- **CMS source.** **NEW** array of media in **Settings → Gallery Strip** (or in the Homepage global). Editor picks N images; the seamless duplicate is rendered automatically.

---

## 5. Artists (homepage subset)

**What it shows.** 12 artist cards. Each: artwork image, name, role line ("Country, b. YYYY" / "YYYY–YYYY"), work title + medium caption. Section CTA reads "View All 54 Artists" → `/artists`.

Currently shown order: Cruz-Diez, Ben Abounassif, Pérez-Flores, Asis, Basbous, Adami, Khal, Azzawi, Moualla, Chamoun, El Hajj, Kronschlaeger.

- **Selectable.** Yes — curated 12 from 54 artists.
- **Orderable.** Yes — explicit order.
- **Editable fields used per artist.** `name`, `displayMeta` (role line), `featuredArtwork` (image used on the home card — distinct from the artist-page portrait, often a `-sml.jpg` variant), `featuredArtworkTitle`, `featuredArtworkMedium`.
- **CMS source.**
  - **Existing:** Artists collection. Has `name`, `displayMeta`, `portrait`, `portraitTitle`, `portraitMedium`.
  - **Schema gap:** add `featuredArtwork` (upload), `featuredArtworkTitle` (text), `featuredArtworkMedium` (text). The home card uses these three; artist-page hero keeps using the existing portrait fields.
  - **Selection / order:** add `featuredArtists` relationship (hasMany, ordered) on the **Homepage global**.
- **Computed.** "View All 54 Artists" — derive `54` from total count, don't hardcode.

---

## 6. About

**What it shows.** Two columns. Left: "Philosophy" label, founder portrait, blockquote, attribution. Right: "Three Decades of Vision" heading, 3 paragraphs of body, **4 milestones** (1996 / 2007 / 2010 / 300+).

- **Selectable.** No.
- **Orderable.** Milestones: yes. Body paragraphs: order is editorial (rich text).
- **Editable fields.** `portrait` (upload), `quote`, `attribution`, `heading`, `body` (rich text, multi-paragraph), `milestones: array of { value, label }`.
- **CMS source.** **NEW: About global** (or About tab inside the Homepage global). Currently the CMS port hardcodes this.

---

## 7. News

**What it shows.** "In the News / Highlights" header. Two news cards today, but the section is built to extend. Each card: image, badge ("Retrospective" / "Biennale", optional `gold` modifier for emphasis), date range, location, title, subtitle, venue line (with curator), excerpt paragraph, "Read more" link to a per-news detail page (`news/{slug}.html`).

- **Selectable.** Yes — homepage shows curated 2–4.
- **Orderable.** Yes — likely chronological default but editor overrides.
- **Editable fields per news item.** `slug`, `title`, `subtitle`, `dateRange` (display string), `location`, `venue` (rich — includes curator), `excerpt`, `coverImage`, `badgeLabel`, `badgeStyle: default | gold`, `body` (rich text, for the detail page).
- **CMS source.** **NEW: News collection.** Doesn't exist yet. Plus **Homepage.featuredNews** relation (hasMany, ordered) for which appear on home.
- **Routes needed.** `/news` index + `/news/[slug]` detail (currently the customer wrote them as static `news/*.html`).

---

## 8. Exhibitions Archive (Recent Exhibitions)

**What it shows.** 6 cards: cover image (sometimes flagged `is-artwork` for non-photo aspect handling), "Month YYYY" line, title (em-dashed format), city.

- **Selectable.** Yes — curated 6.
- **Orderable.** Yes — explicit (chronological-ish but the editor decides).
- **Editable fields used.** `coverImage`, `coverIsArtwork` (boolean for aspect/styling), `displayDates` (or "Month YYYY" rollup), `title`, `city`.
- **CMS source.**
  - **Existing:** Exhibitions collection.
  - **Schema gap:** add `coverIsArtwork: boolean` (default false) for the contain-fit styling.
  - **Selection / order:** add `featuredPastExhibitions` relationship (hasMany, ordered) on the **Homepage global**.
  - **Default fallback** if relation is empty: most-recent 6 by `startDate`.

---

## 9. Collection (Selected / Available Works)

**What it shows.** 8 cards. Each: image, artist name, work title (or location/dates as fallback), medium. Each card links back to the artist page (`artists/X.html`).

This section is effectively an **artist showcase**, not a separate "artwork" entity — every card resolves to an artist URL.

- **Selectable.** Yes — curated 8.
- **Orderable.** Yes — explicit.
- **Editable fields per card.** `artist` (relation, used for link + display name), `image` (upload, may differ from the artist's portrait), `title` (free text — work title or location/dates fallback), `medium` (free text — "Mixed media" / "Bronze sculpture" etc.).
- **CMS source.** Two viable models — **pick one before implementing**:
  - **(A) Inline on Homepage global.** `featuredCollectionWorks: array of { artist, image, title, medium }`. Lightweight; editor curates inside Homepage.
  - **(B) New CollectionWorks collection.** Each work as a record with `artist`, `image`, `title`, `medium`, plus optional commerce fields (`forSale`, `priceOnRequest`, `dimensions`). Heavier but enables a future `/collection` index page or Artsy export.
- **Recommendation.** Start with **(A)**; migrate to **(B)** only when a `/collection` index page becomes a need.

---

## 10. Latest — Current & Upcoming (fairs)

**What it shows.** Section labelled "Art Fairs / Current & Upcoming". Two cards today (Art Dubai 2026, VOLTA Basel 2026). Each card has: photo, "Upcoming" status badge, date range, city, **fair name**, booth, venue, two date sub-blocks ("VIP Preview" + "Public Days").

- **Selectable.** Yes — driven by status filter (current + upcoming only).
- **Orderable.** Yes — by start date asc.
- **Editable fields per item.** `coverImage`, `status: upcoming | current | past`, `dateRange` (display string), `city`, `name`, `booth`, `venue`, `dateRows: array of { label, value }` (covers the "VIP Preview" / "Public Days" sub-blocks; flexible for fairs with different schedules).
- **CMS source.** **NEW: Fairs collection.** Section #10 is the rich-card view; Section #11 is the compact-logo view. **Same collection, two views.**

---

## 11. Art Fairs (full grid)

**What it shows.** Section labelled "Art Fairs". 12 cards in a logo grid: square logo, fair name, location, description, status/year line ("Booth C01" / "Recurring Participant" / "2024 Participant").

- **Selectable.** Yes — full participation list (less curated than #10, but the editor still chooses which to surface).
- **Orderable.** Yes — explicit (currently grouped visually by recurrence/relevance, not chronologically).
- **Editable fields per item.** `logo` (upload — separate from the photo on the rich card), `name`, `location`, `description`, `participationLine` (free text — "Booth C01" / "2024 Participant" / "Recurring Participant"), `showInFairsGrid: boolean`.
- **CMS source.** Same **Fairs collection** as #10. This view filters `where showInFairsGrid: true` (or simply all, ordered).

---

## 12. Contact

**What it shows.** Three city blocks (Paris / Beirut / New York). Each: city heading, address (multi-line, sometimes 2 separate addresses), phone(s) (NYC has 2), email, hours. Plus an inquiry CTA box at the bottom.

- **Selectable.** No — fixed 3 locations.
- **Orderable.** Yes — display order across the 3 cards.
- **Editable fields per location.** `city`, `addresses: array of textarea` (Paris has TWO distinct addresses, currently rendered with `<br><br>` between), `phones: array of text` (NYC has TWO), `email`, `hours`, `presenceText` (optional — used by NYC where there's no real address; renders as "Presence: By appointment only").
- **CMS source.**
  - **Existing:** Settings → Locations array.
  - **Schema gaps to fix:**
    - `phone` is single string today → change to `phones: array`.
    - `addressLines` is one textarea → change to `addresses: array of textarea`.
    - Add `presenceText` (optional string) for the NYC variant.
- **Inquiry CTA copy** ("Interested in a work or exhibition? …" + button + email link). Currently hardcoded. Move to `Settings → Contact CTA` or `Homepage.contactCta` with fields `heading`, `subheading`, `buttonLabel`, `buttonHref`.

---

## 13. Footer

**What it shows.** Logo, tagline paragraph, 4 social icons (Instagram, Artsy, Artnet, Facebook), 2 link columns (Gallery / Information), copyright + "Paris · New York · Beirut".

- **Editable fields.** Tagline, social URLs (and which platforms appear), link columns (label + href arrays).
- **CMS source.**
  - **Existing:** Settings (`tagline`, `socials.instagram/facebook/artsy`).
  - **Schema gap:** add `socials.artnet` (the rendered footer has 4 icons, the CMS only models 3).
  - Footer link columns are static today — could become `Settings → Footer.linkColumns: array of { heading, links: array of { label, href } }` if the customer wants to edit them later. Defer until requested.

---

## 14. Floating WhatsApp button

**What it shows.** Fixed-position WhatsApp icon in bottom-right. Pre-fills a message: `"Hello, I'd like to know more about Mark Hachem Gallery."`

- **Editable fields.** `whatsappNumber`, `whatsappPrefilledMessage`.
- **CMS source.**
  - **Existing:** `Settings.whatsappNumber`.
  - **Schema gap:** add `Settings.whatsappPrefilledMessage`. Currently hardcoded in HTML.

---

## Gap summary — what the CMS doesn't model yet

| Section | Need | Action |
|---|---|---|
| Nav | Editable menu items | Add `Settings → Navigation` array |
| Hero copy | Editable kicker / title / tagline / mobile image | New **Homepage global** |
| Gallery strip | Curated set of N photos, ordered | New `Settings → Gallery Strip` array (or in Homepage global) |
| Artists (home) | Featured subset + per-card artwork ≠ portrait | Add `featuredArtwork` / `featuredArtworkTitle` / `featuredArtworkMedium` to **Artists**; add `featuredArtists` relation to **Homepage** |
| About | Quote + body + milestones | New **About** global (or About tab in Homepage) |
| News | Cards on home + detail pages | **NEW: News collection** + `Homepage.featuredNews` relation; `/news` and `/news/[slug]` routes |
| Past exhibitions (home) | Curated 6, with `is-artwork` cover styling | Add `coverIsArtwork: boolean` to **Exhibitions**; add `featuredPastExhibitions` relation to **Homepage** |
| Now Showing title styling | Optional two-line break | Either split into `titleLine1`/`titleLine2`, or drop the line break |
| Collection (home) | 8 curated works with image + caption + artist link | Inline array on **Homepage** (option A) — defer dedicated CollectionWorks collection until needed |
| Latest (current/upcoming fairs) | Rich detail (booth, VIP, public days) | **NEW: Fairs collection** with `status` enum + `dateRows` array |
| Art Fairs (full grid) | Same collection, compact logo view | Same Fairs collection + `showInFairsGrid` flag + separate `logo` upload |
| Contact | Multiple phones / addresses per city, NYC "Presence" line | Extend **Settings.locations** schema |
| Inquiry CTA copy | Editable | Add `Settings → Contact CTA` group (or under Homepage) |
| Footer | Artnet icon | Add `Settings.socials.artnet` |
| WhatsApp prefill | Editable greeting | Add `Settings.whatsappPrefilledMessage` |

---

## Design decisions that block implementation

Before we write code:

1. **Homepage curation pattern.** Do we model curated lists on a single **Homepage global** (one source of truth, easy editor UX, ordered relations), or via per-item flags on each collection (`featured: bool`, `featuredOrder: number`)?
   - Globals are cleaner for ordered curation and keep the homepage editorial in one screen.
   - Flags are cleaner if multiple pages reuse the same "featured" set.
   - **Default recommendation:** Homepage global. Adopt flags only when a second page needs the same set.

2. **Collection works model.** Inline array on Homepage (Option A) vs. dedicated CollectionWorks collection (Option B)?
   - **Default recommendation:** A, until a `/collection` index becomes a real requirement.

3. **News detail pages.** The customer wrote `news/*.html` files by hand. Once we move News into the CMS:
   - Migration — port existing news HTMLs into News records (manual or scripted, similar to the artists/exhibitions seed).
   - Routing — `/news` index + `/news/[slug]` detail in the Next.js frontend.
   - **Open question:** keep the existing news HTMLs alive as legacy URLs, or 301 them to the new slugs?

4. **Title with line break (Now Showing).** Two-field model vs. drop the visual?
   - **Default recommendation:** drop the visual, render the title as a single string. Simpler for the editor; the visual two-line effect was incidental.

5. **Fairs collection scope.** Do we need a `/fairs` index/detail page, or is it homepage-only?
   - Today: homepage-only. If yes, the model can stay narrowly scoped to what the homepage renders; if there's a future `/fairs` page, add description rich-text / press / images for detail.

---

## Open questions for the editor / customer

- Should "Now Showing" support 0 or N exhibitions, not just 1? (Today the section assumes exactly one.)
- For the Gallery Strip — is 15 photos always right, or does the editor change it?
- For the About milestones — fixed at 4, or variable count?
- The "View All 54 Artists" — does the customer want this number to update automatically, or is it part of the editorial copy?
- Inquiry CTA — same email everywhere, or city-specific?
