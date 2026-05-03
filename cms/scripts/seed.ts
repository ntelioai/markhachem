import 'dotenv/config'
import { getPayload } from 'payload'
import * as cheerio from 'cheerio'
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import config from '../src/payload.config.ts'

const SITE_ROOT = '/Volumes/dev/mark-hachem-gallery'

type PayloadInstance = Awaited<ReturnType<typeof getPayload>>

// ─── Lexical helpers ───────────────────────────────────────────────────────────

function toLexical(paragraphs: string[]) {
  const children = paragraphs.filter((p) => p && p.trim()).map((text) => ({
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    textFormat: 0,
    textStyle: '',
    children: [
      {
        type: 'text',
        format: 0,
        mode: 'normal',
        style: '',
        text,
        version: 1,
        detail: 0,
      },
    ],
  }))

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: children.length
        ? children
        : [
            {
              type: 'paragraph',
              format: '',
              indent: 0,
              version: 1,
              direction: 'ltr',
              textFormat: 0,
              textStyle: '',
              children: [],
            },
          ],
    },
  }
}

// ─── Media helpers ─────────────────────────────────────────────────────────────

function mimeFor(filename: string) {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.pdf') return 'application/pdf'
  return 'application/octet-stream'
}

const mediaCache = new Map<string, number | string>()

async function uploadMedia(
  payload: PayloadInstance,
  absPath: string,
  alt: string,
): Promise<number | string | null> {
  if (!absPath) return null
  if (mediaCache.has(absPath)) return mediaCache.get(absPath)!
  if (!existsSync(absPath)) {
    console.warn(`  ! missing image: ${absPath}`)
    return null
  }
  const data = await readFile(absPath)
  const s = await stat(absPath)
  const filename = path.basename(absPath)
  if (s.size === 0) {
    console.warn(`  ! empty file, skipping: ${filename}`)
    return null
  }
  try {
    const doc = await payload.create({
      collection: 'media',
      data: { alt },
      file: { data, name: filename, mimetype: mimeFor(filename), size: s.size },
    })
    mediaCache.set(absPath, doc.id)
    return doc.id
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`  ! upload failed for ${filename}: ${msg}`)
    return null
  }
}

async function downloadToTemp(url: string, filenameHint: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`  ! download failed (${res.status}): ${url}`)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const dir = path.join(os.tmpdir(), 'mhg-seed')
    await mkdir(dir, { recursive: true })
    const dest = path.join(dir, filenameHint)
    await writeFile(dest, buf)
    return dest
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`  ! download error: ${msg}`)
    return null
  }
}

function resolveAsset(fromHtmlFile: string, src: string): string {
  // src examples: "../assets/images/artists/x.jpg" (from artists/x.html)
  //               "assets/images/exhibitions/y.jpg" (from exhibitions.html)
  const htmlDir = path.dirname(fromHtmlFile)
  return path.resolve(htmlDir, src)
}

function cityFromDataAttr(raw: string | undefined): 'paris' | 'new-york' | 'beirut' | 'other' {
  const c = (raw || '').toLowerCase()
  if (c.includes('paris')) return 'paris'
  if (c.includes('beirut')) return 'beirut'
  if (c.includes('new york') || c === 'ny' || c === 'nyc') return 'new-york'
  return 'other'
}

// ─── Markdown helpers (for News bodies) ────────────────────────────────────────

function parseFrontmatter(raw: string): { fm: Record<string, string>; body: string } {
  if (!raw.startsWith('---')) return { fm: {}, body: raw }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { fm: {}, body: raw }
  const fmBlock = raw.slice(3, end).trim()
  const body = raw.slice(end + 4).replace(/^\n+/, '')
  const fm: Record<string, string> = {}
  for (const line of fmBlock.split('\n')) {
    const m = line.match(/^([\w_-]+):\s*(.*)$/)
    if (m) fm[m[1]] = m[2].trim()
  }
  return { fm, body }
}

function stripInlineMarkdown(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, '$1$2')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

function markdownToParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .filter((b) => !b.startsWith('# ')) // drop H1
    .filter((b) => b !== '---') // drop section dividers
    .map(stripInlineMarkdown)
}

// ─── Reset / admin ─────────────────────────────────────────────────────────────

async function resetContent(payload: PayloadInstance) {
  console.log('Clearing existing content...')
  // Clear Homepage relations first, otherwise NOT NULL constraints on join tables
  // (featuredCollectionWorks.artist is required) block artist deletion on re-seed.
  try {
    await payload.updateGlobal({
      slug: 'homepage',
      data: {
        heroImage: null,
        heroImageMobile: null,
        portrait: null,
        featuredArtists: [],
        featuredNews: [],
        featuredPastExhibitions: [],
        featuredCollectionWorks: [],
      } as any,
    })
  } catch {
    // ignore — likely first run with no Homepage row yet
  }
  try {
    await payload.updateGlobal({
      slug: 'settings',
      data: { galleryStrip: [] } as any,
    })
  } catch {
    // ignore
  }
  for (const collection of ['exhibitions', 'artists', 'news', 'fairs', 'media'] as const) {
    const all = await payload.find({ collection, limit: 1000, depth: 0 })
    for (const doc of all.docs) {
      await payload.delete({ collection, id: doc.id as any })
    }
  }
}

async function ensureAdmin(payload: PayloadInstance) {
  const existing = await payload.find({ collection: 'users', limit: 1 })
  if (existing.totalDocs > 0) return
  const email = 'admin@markhachem.com'
  const password = 'ChangeMeNow!2026'
  await payload.create({
    collection: 'users',
    data: { email, password },
  })
  console.log(`Created admin user — email: ${email}  password: ${password}`)
  console.log('  → change this immediately in the admin panel.')
}

// ─── Homepage roster scrape (informs seedArtists & seedExhibitions) ────────────

type FeaturedArtworkInfo = {
  imgSrc: string
  title: string
  medium: string
}

function readHomepageRoster(): {
  featuredArtworkBySlug: Map<string, FeaturedArtworkInfo>
  coverIsArtworkSubstrings: string[]
} {
  const indexPath = path.join(SITE_ROOT, 'index.html')
  const $ = cheerio.load(readFileSync(indexPath, 'utf8'))

  const featuredArtworkBySlug = new Map<string, FeaturedArtworkInfo>()
  $('.artists .artist-card').each((_, el) => {
    const $c = $(el)
    const href = ($c.attr('href') || '').trim()
    if (!href.startsWith('artists/')) return
    const slug = href.replace('artists/', '').replace(/\.html$/, '')
    const imgSrc = $c.find('.artist-card-image img').attr('src') || ''
    const title = $c.find('.artist-card-work').contents().filter((_, n) => n.type === 'tag' && (n as any).name === 'em').first().text().trim()
      || $c.find('.artist-card-work em').first().text().trim()
    const medium = $c.find('.artist-card-medium').first().text().trim()
    featuredArtworkBySlug.set(slug, { imgSrc, title, medium })
  })

  // Past exhibitions on home — match cover img.is-artwork
  const coverIsArtworkSubstrings: string[] = []
  $('.exhibitions .exhibition-card').each((_, el) => {
    const $c = $(el)
    const cls = $c.find('.exhibition-card-image img').attr('class') || ''
    if (cls.includes('is-artwork')) {
      const t = $c.find('.exhibition-card-title').text().trim()
      // pick a stable substring (drop em-dashes and quotes for matching)
      const stripped = t
        .replace(/[‘’“”"]/g, '')
        .replace(/\s+—\s+.*$/, '')
        .trim()
      if (stripped) coverIsArtworkSubstrings.push(stripped.toLowerCase())
    }
  })
  return { featuredArtworkBySlug, coverIsArtworkSubstrings }
}

// ─── Artists ───────────────────────────────────────────────────────────────────

async function seedArtists(
  payload: PayloadInstance,
  homepage: { featuredArtworkBySlug: Map<string, FeaturedArtworkInfo> },
) {
  const artistsHtmlPath = path.join(SITE_ROOT, 'artists.html')
  const html = await readFile(artistsHtmlPath, 'utf8')
  const $ = cheerio.load(html)
  const cards = $('.artist-card').toArray()
  console.log(`\nSeeding ${cards.length} artists...`)

  let order = 1
  for (const card of cards) {
    const $c = $(card)
    const href = ($c.attr('href') || '').trim()
    if (!href.startsWith('artists/')) continue
    const slug = href.replace('artists/', '').replace(/\.html$/, '')
    const category = ($c.attr('data-category') || 'contemporary').toLowerCase() as
      | 'modern'
      | 'contemporary'
    const name = $c.find('.artist-card-name').text().trim()
    const displayMeta = $c.find('.artist-card-sub').text().trim()
    const nationality = displayMeta.split(',')[0]?.trim() || ''

    const detailAbs = path.join(SITE_ROOT, href)
    let portraitId: number | string | null = null
    let portraitTitle = ''
    let portraitMedium = ''
    let bioParas: string[] = []

    if (existsSync(detailAbs)) {
      const detailHtml = await readFile(detailAbs, 'utf8')
      const $d = cheerio.load(detailHtml)
      const portraitSrc = $d('.profile-portrait-frame img').attr('src')
      if (portraitSrc) {
        const portraitAbs = resolveAsset(detailAbs, portraitSrc)
        portraitId = await uploadMedia(payload, portraitAbs, `${name} — portrait`)
      }
      portraitTitle = $d('.profile-portrait-caption .portrait-title').text().trim()
      portraitMedium = $d('.profile-portrait-caption .portrait-medium').text().trim()
      bioParas = $d('.profile-text p')
        .map((_, el) => $d(el).text().trim())
        .get()
        .filter(Boolean)
    }

    if (!portraitId) {
      const rosterImg = $c.find('.artist-card-image img').attr('src')
      if (rosterImg) {
        const rosterAbs = resolveAsset(artistsHtmlPath, rosterImg)
        portraitId = await uploadMedia(payload, rosterAbs, `${name} — artwork`)
      }
    }

    if (!portraitTitle) portraitTitle = $c.find('.artist-card-artwork em').text().trim()
    if (!portraitMedium) portraitMedium = $c.find('.artist-card-medium').text().trim()

    // Homepage card — the customer's index.html may use a different image (typically `-sml`)
    let featuredArtworkId: number | string | null = null
    let featuredArtworkTitle = ''
    let featuredArtworkMedium = ''
    const hp = homepage.featuredArtworkBySlug.get(slug)
    if (hp) {
      featuredArtworkTitle = hp.title
      featuredArtworkMedium = hp.medium
      if (hp.imgSrc) {
        const indexHtmlPath = path.join(SITE_ROOT, 'index.html')
        const abs = resolveAsset(indexHtmlPath, hp.imgSrc)
        featuredArtworkId = await uploadMedia(payload, abs, `${name} — homepage artwork`)
      }
    }

    await payload.create({
      collection: 'artists',
      data: {
        name,
        slug,
        category,
        nationality,
        displayMeta,
        portrait: portraitId as any,
        portraitTitle,
        portraitMedium,
        bio: toLexical(bioParas),
        sortOrder: order++,
        featuredArtwork: featuredArtworkId as any,
        featuredArtworkTitle,
        featuredArtworkMedium,
      },
    })
    console.log(`  ✓ ${slug}${hp ? ' (home)' : ''}`)
  }
}

// ─── Exhibitions ───────────────────────────────────────────────────────────────

async function seedExhibitions(
  payload: PayloadInstance,
  homepage: { coverIsArtworkSubstrings: string[] },
) {
  const exhibitionsHtmlPath = path.join(SITE_ROOT, 'exhibitions.html')
  const html = await readFile(exhibitionsHtmlPath, 'utf8')
  const $ = cheerio.load(html)
  const cards = $('.exh-card').toArray()
  console.log(`\nSeeding ${cards.length} exhibitions...`)

  const usedSlugs = new Set<string>()
  for (const card of cards) {
    const $c = $(card)
    const title = $c.find('.exh-card-title').text().trim()
    if (!title) continue
    const cityRaw = $c.attr('data-city')
    const year = $c.attr('data-year')
    const displayDates = $c.find('.exh-card-meta').text().trim()
    const location = $c.find('.exh-card-location').text().trim()
    const desc = $c.find('.exh-card-desc').text().trim()
    const city = cityFromDataAttr(cityRaw)

    const imgSrc = $c.find('.exh-card-image img').attr('src')
    let coverId: number | string | null = null
    if (imgSrc) {
      const abs = resolveAsset(exhibitionsHtmlPath, imgSrc)
      coverId = await uploadMedia(payload, abs, title)
    }

    const baseSlug =
      title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 80) || 'exhibition'
    let slug = year && /^\d{4}$/.test(year) ? `${baseSlug}-${year}` : baseSlug
    let n = 2
    while (usedSlugs.has(slug)) slug = `${baseSlug}-${n++}`
    usedSlugs.add(slug)

    let startDate: string | undefined
    if (year && /^\d{4}$/.test(year)) startDate = `${year}-01-01`

    const titleLc = title.toLowerCase()
    const coverIsArtwork = homepage.coverIsArtworkSubstrings.some((s) => titleLc.includes(s))

    try {
      await payload.create({
        collection: 'exhibitions',
        data: {
          title,
          slug,
          city,
          displayDates,
          location,
          description: toLexical(desc ? [desc] : []),
          coverImage: coverId as any,
          coverIsArtwork,
          startDate,
        },
      })
      console.log(`  ✓ ${title}${coverIsArtwork ? ' (artwork cover)' : ''}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`  ! failed to create "${title}" (${slug}): ${msg}`)
    }
  }
}

// ─── News ──────────────────────────────────────────────────────────────────────

type NewsSeedEntry = {
  slug: string
  cover: string
  badgeLabel: string
  badgeStyle: 'default' | 'gold'
  excerpt: string
  sortOrder: number
}

const NEWS_ENTRIES: NewsSeedEntry[] = [
  {
    slug: 'hamed-abdalla-imarabe',
    cover: 'poster-banner.jpg',
    badgeLabel: 'Retrospective',
    badgeStyle: 'gold',
    excerpt:
      "The Institut du monde arabe-Tourcoing presents a major retrospective dedicated to Hamed Abdalla (1917-1985), one of the defining figures of modern Egyptian art. Bringing together paintings, drawings, lithographs, and archival materials preserved by the artist's family, the exhibition retraces the successive phases of his life and work — from the 'Signs of Egypt' series to the anthropomorphic Arabic letterforms of his Paris years.",
    sortOrder: 1,
  },
  {
    slug: 'sara-shamma-venice',
    cover: 'poster-biennale.jpg',
    badgeLabel: 'Biennale',
    badgeStyle: 'default',
    excerpt:
      'Sara Shamma has been selected for the 61st Venice Biennale. Commissioned by the Syrian Ministry of Culture and curated by Yuko Hasegawa — director of the 21st Century Museum of Contemporary Art in Kanazawa — the multi-sensory pavilion "The Tower Tomb of Palmyra" will occupy the open-air courtyard of the Università IUAV di Venezia, focusing on the ancient city once ruled by the warrior queen Zenobia.',
    sortOrder: 2,
  },
]

function parseDateRangeStart(s: string): string | undefined {
  // "7 March 2026 — 12 July 2026" → "2026-03-07"
  const months: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  }
  const m = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
  if (!m) return undefined
  const day = m[1].padStart(2, '0')
  const mon = months[m[2].toLowerCase()]
  if (!mon) return undefined
  return `${m[3]}-${mon}-${day}`
}

async function seedNews(payload: PayloadInstance) {
  console.log(`\nSeeding ${NEWS_ENTRIES.length} news...`)
  for (const entry of NEWS_ENTRIES) {
    const dir = path.join(SITE_ROOT, 'assets/images/news', entry.slug)
    const mdPath = path.join(dir, 'text.md')
    if (!existsSync(mdPath)) {
      console.warn(`  ! missing ${mdPath}, skipping`)
      continue
    }
    const raw = await readFile(mdPath, 'utf8')
    const { fm, body } = parseFrontmatter(raw)
    const title = fm.title || entry.slug
    const subtitle = fm.subtitle || ''
    const dateRange = fm.dates || ''
    const venueText = [fm.venue, fm.curator ? `Curated by ${fm.curator}` : '']
      .filter(Boolean)
      .join(' · ')
    const publishedDate = parseDateRangeStart(dateRange)
    const paragraphs = markdownToParagraphs(body)

    const coverId = await uploadMedia(payload, path.join(dir, entry.cover), title)

    await payload.create({
      collection: 'news',
      data: {
        title,
        slug: entry.slug,
        subtitle,
        dateRange,
        location: title.includes('Tourcoing') ? 'Tourcoing' : title.includes('Venice') ? 'Venice' : '',
        venue: venueText ? toLexical([venueText]) : undefined,
        excerpt: entry.excerpt,
        body: toLexical(paragraphs),
        coverImage: coverId as any,
        badgeLabel: entry.badgeLabel,
        badgeStyle: entry.badgeStyle,
        featured: true,
        sortOrder: entry.sortOrder,
        publishedDate,
      },
    })
    console.log(`  ✓ ${entry.slug}`)
  }
}

// ─── Fairs ─────────────────────────────────────────────────────────────────────

type FairSeedEntry = {
  name: string
  logo: string
  status: 'upcoming' | 'current' | 'past'
  participationLine: string
  showInLatest?: boolean
  // §10 details (optional)
  booth?: string
  venue?: string
  dateRange?: string
  city?: string
  startDate?: string
  cover?: string
  dateRows?: { label: string; value: string }[]
}

const FAIR_ENTRIES: FairSeedEntry[] = [
  {
    name: 'VOLTA Art Fair',
    logo: 'volta-logo.png',
    status: 'upcoming',
    participationLine: 'Booth C01',
    showInLatest: true,
    booth: 'C2',
    venue: 'Hall 4.U, Congress Center, Messeplatz 21, Basel',
    dateRange: '17–21 June 2026',
    city: 'Basel',
    startDate: '2026-06-17',
    cover: 'exhibitions/images/Volta-Basel-photo.jpeg',
    dateRows: [
      { label: 'VIP Preview', value: 'Wednesday, 17 June · 10am–8pm' },
      { label: 'Public Days', value: '18–21 June' },
    ],
  },
  { name: 'ZONAMACO', logo: 'zona-maco-logo.png', status: 'past', participationLine: '2024 Participant' },
  { name: 'Art Miami', logo: 'art-miami-logo.png', status: 'past', participationLine: 'Booth AM 316' },
  {
    name: 'Art Dubai',
    logo: 'art-dubai-logo.png',
    status: 'upcoming',
    participationLine: 'Recurring Participant',
    showInLatest: true,
    booth: 'A7',
    venue: 'Madinat Jumeirah Conference & Events Centre, Dubai',
    dateRange: '14–17 May 2026',
    city: 'Dubai',
    startDate: '2026-05-14',
    cover: 'exhibitions/images/Art-Dubai-photo.jpeg',
    dateRows: [
      { label: 'VIP Preview', value: 'Thursday, 14 May · 2pm–9pm' },
      { label: 'Public Days', value: '15–17 May' },
    ],
  },
  { name: 'KIAF Seoul', logo: 'kiaf-seoul-logo.png', status: 'past', participationLine: 'Recurring Participant' },
  { name: 'Contemporary Istanbul', logo: 'contemporary-istanbul-logo.png', status: 'past', participationLine: 'Recurring Participant' },
  { name: 'Moderne Art Fair', logo: 'moderne-art-fair-logo.png', status: 'past', participationLine: 'Recurring Participant' },
  { name: 'Art Palm Beach', logo: 'art-palm-beach-logo.png', status: 'past', participationLine: 'Recurring Participant' },
  { name: 'Abu Dhabi Art', logo: 'abu-dhabi-art-logo.svg', status: 'past', participationLine: '2025 Participant' },
  { name: 'Art Cairo', logo: 'art-cairo-logo.png', status: 'past', participationLine: '2026 Participant' },
  { name: 'MENART Fair', logo: 'menart-fair-logo.png', status: 'past', participationLine: '2023 Participant' },
  { name: 'Art Paris', logo: 'art-paris-logo.png', status: 'past', participationLine: '2019 Participant' },
]

async function seedFairs(payload: PayloadInstance) {
  console.log(`\nSeeding ${FAIR_ENTRIES.length} fairs...`)

  // Scrape descriptions + locations verbatim from index.html .fair-card by name
  const indexHtml = await readFile(path.join(SITE_ROOT, 'index.html'), 'utf8')
  const $ = cheerio.load(indexHtml)
  const fromIndexByName = new Map<string, { location: string; description: string }>()
  $('.fairs .fair-card').each((_, el) => {
    const $c = $(el)
    const name = $c.find('.fair-card-name').text().trim()
    const location = $c.find('.fair-card-location').text().trim()
    const description = $c.find('.fair-card-desc').text().trim()
    fromIndexByName.set(name, { location, description })
  })

  let order = 1
  for (const entry of FAIR_ENTRIES) {
    const fromIndex = fromIndexByName.get(entry.name) || { location: '', description: '' }
    const slug = entry.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
    const logoId = await uploadMedia(
      payload,
      path.join(SITE_ROOT, 'assets/images/fairs', entry.logo),
      `${entry.name} logo`,
    )
    const coverId = entry.cover
      ? await uploadMedia(payload, path.join(SITE_ROOT, 'assets/images', entry.cover), entry.name)
      : null

    await payload.create({
      collection: 'fairs',
      data: {
        name: entry.name,
        slug,
        status: entry.status,
        showInLatest: !!entry.showInLatest,
        showInFairsGrid: true,
        sortOrder: order++,
        logo: logoId as any,
        coverImage: coverId as any,
        city: entry.city || '',
        location: fromIndex.location,
        description: fromIndex.description,
        participationLine: entry.participationLine,
        booth: entry.booth || '',
        venue: entry.venue || '',
        dateRange: entry.dateRange || '',
        startDate: entry.startDate,
        dateRows: entry.dateRows || [],
      },
    })
    console.log(`  ✓ ${entry.name}${entry.showInLatest ? ' (latest)' : ''}`)
  }
}

// ─── Settings ──────────────────────────────────────────────────────────────────

async function seedSettings(payload: PayloadInstance) {
  console.log('\nSeeding Settings global...')
  const indexHtml = await readFile(path.join(SITE_ROOT, 'index.html'), 'utf8')
  const $ = cheerio.load(indexHtml)

  const tagline = $('.footer-tagline').text().trim()

  const socialLinks: Record<string, string> = {}
  $('.footer-social a').each((_, a) => {
    const href = $(a).attr('href') || ''
    const label = ($(a).attr('aria-label') || '').toLowerCase()
    if (label) socialLinks[label] = href
  })

  // Gallery strip — 15 photos
  const stripDir = path.join(SITE_ROOT, 'assets/images/gallery-strip')
  const galleryStrip: { image: any; alt: string }[] = []
  for (let i = 1; i <= 15; i++) {
    const filename = `gallery-photo-${String(i).padStart(2, '0')}.jpeg`
    const id = await uploadMedia(payload, path.join(stripDir, filename), 'Mark Hachem Gallery')
    if (id) galleryStrip.push({ image: id, alt: 'Mark Hachem Gallery' })
  }

  const navigation = {
    links: [
      { label: 'About', href: '/#about' },
      { label: 'Artists', href: '/artists' },
      { label: 'Exhibitions', href: '/exhibitions' },
      { label: 'Art Fairs', href: '/#fairs' },
      { label: 'News', href: '/news' },
    ],
  }

  const locations = [
    {
      city: 'Paris',
      isPrimary: true,
      addresses: [
        { lines: '28 Place des Vosges\n75003 Paris, France' },
        { lines: '44 Rue des Tournelles\n75004 Paris, France' },
      ],
      phones: [{ value: '+33 (0)1 42 76 94 93' }],
      email: 'paris@markhachem.com',
      hours: 'Daily, 10h30 AM till 7h30 PM',
    },
    {
      city: 'Beirut',
      isPrimary: false,
      addresses: [
        { lines: 'Capital Gardens Building\nSalloum Street, Minet al-Hosn\nBeirut, Lebanon' },
      ],
      phones: [{ value: '+961 1 999 313' }],
      email: 'beirut@markhachem.com',
      hours: 'Monday – Saturday, 10h30 AM till 7h30 PM',
    },
    {
      city: 'New York',
      isPrimary: false,
      presenceText: 'By appointment only',
      phones: [
        { value: '+1 212 585 2900' },
        { value: '+1 917 318 4445' },
      ],
      email: 'nyc@markhachem.com',
    },
  ]

  await payload.updateGlobal({
    slug: 'settings',
    data: {
      galleryName: 'Mark Hachem Gallery',
      tagline,
      foundedYear: 1996,
      foundedCity: 'Paris',
      whatsappNumber: '+33 6 09 18 27 11',
      whatsappPrefilledMessage: "Hello, I'd like to know more about Mark Hachem Gallery.",
      navigation,
      galleryStrip,
      locations,
      socials: {
        instagram: socialLinks['instagram'] || '',
        facebook: socialLinks['facebook'] || '',
        artsy: socialLinks['artsy'] || '',
        artnet: socialLinks['artnet'] || '',
      },
    } as any,
  })
  console.log(`  ✓ settings — ${locations.length} locations, ${galleryStrip.length} strip photos`)
}

// ─── Homepage global (runs LAST — needs all relations) ─────────────────────────

const FEATURED_ARTIST_SLUGS = [
  'carlos-cruz-diez',
  'ben-abounassif',
  'dario-perez-flores',
  'antonio-asis',
  'alfred-basbous',
  'franco-adami',
  'helen-khal',
  'dia-azzawi',
  'ahmad-moualla',
  'chaouki-chamoun',
  'fatima-el-hajj',
  'alois-kronschlaeger',
]

const FEATURED_NEWS_SLUGS = ['hamed-abdalla-imarabe', 'sara-shamma-venice']

// Substrings to identify featured past exhibitions among all 106 in the DB.
const FEATURED_PAST_EXH_KEYS = [
  'ceci nest pas une photo', // Yves Hayat
  'entre terre et mer',       // Irene Ghanem
  'sailing the sevan',        // James Chedburn
  'résonances cinétiques',   // Paris
  'behind the image',         // Daisy Abi Jaber
  'jean khalife',             // The Legacy
]

const COLLECTION_WORKS = [
  {
    artistSlug: 'hamed-abdalla',
    image: 'assets/images/abdalla-standing-woman.jpg',
    title: 'Standing Woman, 91.5 × 43 cm',
    medium: 'Mixed media',
  },
  {
    artistSlug: 'ghazi-baker',
    image: 'assets/images/artists/ghazi-baker-sml.jpg',
    title: 'Lebanon',
    medium: 'Contemporary sculpture',
  },
  {
    artistSlug: 'carlos-cruz-diez',
    image: 'assets/images/cruz-diez-chromointerference.png',
    title: 'Chromointerférence, Paris',
    medium: 'Chromography on aluminum',
  },
  {
    artistSlug: 'yves-hayat',
    image: 'assets/images/artists/yves-hayat-sml.jpg',
    title: 'France, b. 1946',
    medium: 'Contemporary mixed media',
  },
  {
    artistSlug: 'philippe-hiquily',
    image: 'assets/images/artists/philippe-hiquily-sml.jpg',
    title: 'France, 1925–2013',
    medium: 'Biomorphic sculpture in metal',
  },
  {
    artistSlug: 'hussein-madi',
    image: 'assets/images/artists/hussein-madi-sml.jpg',
    title: 'Lebanon, 1938–2024',
    medium: 'Painting and sculpture',
  },
  {
    artistSlug: 'polles',
    image: 'assets/images/artists/polles-sml.jpg',
    title: 'France, b. 1945',
    medium: 'Bronze sculpture',
  },
  {
    artistSlug: 'jesus-rafael-soto',
    image: 'assets/images/artists/jesus-rafael-soto-sml.jpg',
    title: 'Vibración',
    medium: 'Mixed media on wood',
  },
]

async function findIdsBySlug(
  payload: PayloadInstance,
  collection: 'artists' | 'news',
  slugs: string[],
): Promise<(number | string)[]> {
  const ids: (number | string)[] = []
  for (const slug of slugs) {
    const r = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0 })
    if (r.docs[0]) ids.push(r.docs[0].id as any)
    else console.warn(`  ! ${collection}: slug not found: ${slug}`)
  }
  return ids
}

async function findExhibitionIdsBySubstring(
  payload: PayloadInstance,
  keys: string[],
): Promise<(number | string)[]> {
  const all = await payload.find({ collection: 'exhibitions', limit: 500, depth: 0 })
  const ids: (number | string)[] = []
  const norm = (s: string) =>
    s.toLowerCase().replace(/['’`"“”]/g, '').replace(/\s+/g, ' ').trim()
  for (const k of keys) {
    const kN = norm(k)
    const match = all.docs.find((d: any) => norm(d.title || '').includes(kN))
    if (match) ids.push(match.id as any)
    else console.warn(`  ! exhibitions: no match for "${k}"`)
  }
  return ids
}

async function seedHomepage(payload: PayloadInstance) {
  console.log('\nSeeding Homepage global...')

  // Hero images
  const heroImageId = await uploadMedia(
    payload,
    path.join(SITE_ROOT, 'assets/images/og-image.jpg'),
    'Mark Hachem Gallery — hero',
  )
  const heroImageMobileId = await uploadMedia(
    payload,
    path.join(SITE_ROOT, 'assets/images/og-image-mobile.jpg'),
    'Mark Hachem Gallery — hero (mobile)',
  )

  // About portrait — external; download then upload
  const portraitTmp = await downloadToTemp(
    'https://selectionsarts.com/wp-content/uploads/selections-arts-mark-hachem.jpg',
    'mark-hachem-portrait.jpg',
  )
  const portraitId = portraitTmp ? await uploadMedia(payload, portraitTmp, 'Mark Hachem — Founder') : null

  // About body — verbatim from index.html
  const indexHtml = await readFile(path.join(SITE_ROOT, 'index.html'), 'utf8')
  const $ = cheerio.load(indexHtml)
  const aboutQuote = $('.about-quote').first().text().trim().replace(/^[“"]/, '').replace(/[”"]$/, '')
  const aboutAttribution = $('.about-attribution').first().text().trim()
  const aboutHeading = $('.about-right h3').first().text().trim()
  const aboutBodyParas = $('.about-right p.about-text')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)

  const milestones = $('.about-milestones .milestone')
    .map((_, el) => {
      const $m = $(el)
      const value = $m.find('.milestone-year').text().trim()
      const label = $m.find('.milestone-text').text().trim()
      return { value, label }
    })
    .get()

  // Tagline pillars from hero
  const taglinePillars = $('.hero-tagline')
    .first()
    .contents()
    .filter((_, n) => n.type === 'text')
    .map((_, n) => (n as any).data?.trim())
    .get()
    .filter(Boolean)
    .map((t: string) => ({ text: t }))

  // Resolve relations
  const featuredArtists = await findIdsBySlug(payload, 'artists', FEATURED_ARTIST_SLUGS)
  const featuredNews = await findIdsBySlug(payload, 'news', FEATURED_NEWS_SLUGS)
  const featuredPastExhibitions = await findExhibitionIdsBySubstring(payload, FEATURED_PAST_EXH_KEYS)

  // Featured collection works
  const featuredCollectionWorks = []
  for (const cw of COLLECTION_WORKS) {
    const r = await payload.find({
      collection: 'artists',
      where: { slug: { equals: cw.artistSlug } },
      limit: 1,
      depth: 0,
    })
    const artistId = r.docs[0]?.id
    if (!artistId) {
      console.warn(`  ! collection works: artist slug not found: ${cw.artistSlug}`)
      continue
    }
    const imgId = await uploadMedia(
      payload,
      path.join(SITE_ROOT, cw.image),
      `${cw.artistSlug} — collection`,
    )
    featuredCollectionWorks.push({
      artist: artistId,
      image: imgId,
      title: cw.title,
      medium: cw.medium,
    })
  }

  await payload.updateGlobal({
    slug: 'homepage',
    data: {
      heroImage: heroImageId,
      heroImageMobile: heroImageMobileId,
      kicker: 'Est. Paris, 1996',
      titleStrong: 'Mark',
      titleRest: 'Hachem',
      taglinePillars: taglinePillars.length
        ? taglinePillars
        : [{ text: 'Kinetic Art' }, { text: 'Modern Art' }, { text: 'Contemporary Art' }],
      portrait: portraitId,
      quote: aboutQuote,
      attribution: aboutAttribution || '— Mark Hachem',
      heading: aboutHeading || 'Three Decades of Vision',
      body: toLexical(aboutBodyParas),
      milestones,
      featuredArtists,
      featuredNews,
      featuredPastExhibitions,
      featuredCollectionWorks,
      contactCta: {
        heading: 'Interested in a work or exhibition?',
        subheading: 'We welcome inquiries from collectors, institutions, and press.',
        buttonLabel: 'Send Inquiry',
        buttonHref: 'mailto:paris@markhachem.com',
      },
    } as any,
  })
  console.log(
    `  ✓ homepage — ${featuredArtists.length} artists, ${featuredNews.length} news, ${featuredPastExhibitions.length} past, ${featuredCollectionWorks.length} works`,
  )
}

// ─── Run ───────────────────────────────────────────────────────────────────────

async function run() {
  const payload = await getPayload({ config })
  await ensureAdmin(payload)
  await resetContent(payload)

  const homepage = readHomepageRoster()
  console.log(
    `Detected ${homepage.featuredArtworkBySlug.size} homepage artists; ` +
      `${homepage.coverIsArtworkSubstrings.length} past-exhibition artwork covers.`,
  )

  await seedArtists(payload, homepage)
  await seedExhibitions(payload, homepage)
  await seedNews(payload)
  await seedFairs(payload)
  await seedSettings(payload)
  await seedHomepage(payload)
  console.log('\nDone.')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
