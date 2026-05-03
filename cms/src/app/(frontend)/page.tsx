import Link from 'next/link'
import { getPayloadClient } from '@/lib/payload'
import { mediaUrl, mediaAlt } from '@/lib/media'
import { SITE_URL, SITE_NAME } from '@/lib/seo'
import { RichText, richTextToPlainString } from '@/lib/richText'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

const ARROW_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

const ARTIST_CARD_ARROW = (
  <svg viewBox="0 0 24 24">
    <path d="M7 17L17 7M17 7H7M17 7v10" />
  </svg>
)

export default async function HomePage() {
  const payload = await getPayloadClient()

  const homepage: any = await payload.findGlobal({ slug: 'homepage', depth: 2 }).catch(() => null)
  const settings: any = await payload.findGlobal({ slug: 'settings', depth: 2 }).catch(() => null)

  const featuredArtistIds: (number | string)[] = (homepage?.featuredArtists || []).map((a: any) =>
    typeof a === 'object' ? a.id : a,
  )
  const featuredNewsIds: (number | string)[] = (homepage?.featuredNews || []).map((n: any) =>
    typeof n === 'object' ? n.id : n,
  )
  const featuredPastExhIds: (number | string)[] = (homepage?.featuredPastExhibitions || []).map((e: any) =>
    typeof e === 'object' ? e.id : e,
  )

  const [
    nowShowingRes,
    artistsTotalRes,
    featuredArtistsRes,
    featuredNewsRes,
    featuredPastRes,
    latestFairsRes,
    fairsGridRes,
  ] = await Promise.all([
    payload.find({
      collection: 'exhibitions',
      where: { isNowShowing: { equals: true } },
      limit: 1,
      depth: 1,
    }),
    payload.find({ collection: 'artists', limit: 0, depth: 0 }),
    featuredArtistIds.length
      ? payload.find({
          collection: 'artists',
          where: { id: { in: featuredArtistIds } },
          limit: featuredArtistIds.length,
          depth: 1,
        })
      : Promise.resolve({ docs: [] as any[] }),
    featuredNewsIds.length
      ? payload.find({
          collection: 'news',
          where: { id: { in: featuredNewsIds } },
          limit: featuredNewsIds.length,
          depth: 1,
        })
      : Promise.resolve({ docs: [] as any[] }),
    featuredPastExhIds.length
      ? payload.find({
          collection: 'exhibitions',
          where: { id: { in: featuredPastExhIds } },
          limit: featuredPastExhIds.length,
          depth: 1,
        })
      : Promise.resolve({ docs: [] as any[] }),
    payload.find({
      collection: 'fairs',
      where: { showInLatest: { equals: true } },
      sort: 'startDate',
      limit: 6,
      depth: 1,
    }),
    payload.find({
      collection: 'fairs',
      where: { showInFairsGrid: { equals: true } },
      sort: 'sortOrder',
      limit: 50,
      depth: 1,
    }),
  ])

  // Order results to match the Homepage relation order
  const orderById = <T extends { id: number | string }>(docs: T[], ids: (number | string)[]): T[] => {
    const map = new Map(docs.map((d) => [String(d.id), d] as const))
    return ids.map((id) => map.get(String(id))).filter(Boolean) as T[]
  }
  const featuredArtists = orderById(featuredArtistsRes.docs as any[], featuredArtistIds)
  const featuredNews = orderById(featuredNewsRes.docs as any[], featuredNewsIds)
  const featuredPast = orderById(featuredPastRes.docs as any[], featuredPastExhIds)

  const nowShowing = nowShowingRes.docs[0]

  const locations = settings?.locations ?? []
  const primaryLocation = locations.find((l: any) => l.isPrimary) ?? locations[0]
  const inquiryEmail = primaryLocation?.email || 'paris@markhachem.com'
  const galleryStrip = (settings?.galleryStrip ?? []).filter((g: any) => g?.image)

  const heroImage = mediaUrl(homepage?.heroImage, 'hero')
  const heroImageMobile = mediaUrl(homepage?.heroImageMobile, 'hero')
  const heroKicker = homepage?.kicker || 'Est. Paris, 1996'
  const heroTitleStrong = homepage?.titleStrong ?? ''
  const heroTitleRest = homepage?.titleRest ?? ''
  const taglinePillars: { text: string }[] = homepage?.taglinePillars?.length
    ? homepage.taglinePillars
    : [{ text: 'Kinetic Art' }, { text: 'Modern Art' }, { text: 'Contemporary Art' }]

  const aboutPortrait = mediaUrl(homepage?.portrait, 'card')
  const aboutQuote = homepage?.quote || ''
  const aboutAttribution = homepage?.attribution || '— Mark Hachem'
  const aboutHeading = homepage?.heading || 'Three Decades of Vision'
  const milestones: { value: string; label: string }[] = homepage?.milestones || []
  const collectionWorks: any[] = homepage?.featuredCollectionWorks || []

  const contactCta = homepage?.contactCta || {
    heading: 'Interested in a work or exhibition?',
    subheading: 'We welcome inquiries from collectors, institutions, and press.',
    buttonLabel: 'Send Inquiry',
    buttonHref: `mailto:${inquiryEmail}`,
  }

  // JSON-LD ArtGallery
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'ArtGallery',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/assets/images/mark-hachem-logo.png`,
    image: `${SITE_URL}/assets/images/og-image.jpg`,
    description:
      'A platform for kinetic art, modern art, and contemporary art. Founded in Paris, 1996.',
    foundingDate: '1996',
    founder: { '@type': 'Person', name: 'Mark Hachem' },
    address: locations.map((loc: any) => ({
      '@type': 'PostalAddress',
      streetAddress: loc.addresses?.[0]?.lines?.split('\n')[0] ?? loc.presenceText ?? '',
      addressLocality: loc.city,
      ...(loc.city === 'Paris' ? { postalCode: '75003', addressCountry: 'FR' } : {}),
      ...(loc.city === 'Beirut' ? { addressCountry: 'LB' } : {}),
      ...(loc.city === 'New York' ? { addressCountry: 'US' } : {}),
    })),
    telephone: primaryLocation?.phones?.[0]?.value,
    email: primaryLocation?.email,
    sameAs: [
      settings?.socials?.instagram,
      settings?.socials?.facebook,
      settings?.socials?.artsy,
      settings?.socials?.artnet,
    ].filter(Boolean),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      {/* HERO */}
      <section className="hero" id="top">
        <div className="hero-bg">
          <picture>
            {heroImageMobile && <source media="(max-width: 768px)" srcSet={heroImageMobile} />}
            <img src={heroImage || '/assets/images/og-image.jpg'} alt={SITE_NAME} />
          </picture>
        </div>
        <div className="hero-kinetic" aria-hidden="true" />
        <div className="hero-gradient" aria-hidden="true" />
        <div className="hero-content">
          <p className="hero-est">{heroKicker}</p>
          {(heroTitleStrong || heroTitleRest) && (
            <h1 className="hero-title">
              {heroTitleStrong && <strong>{heroTitleStrong}</strong>}
              {heroTitleStrong && heroTitleRest && <br />}
              {heroTitleRest}
            </h1>
          )}
          <p className="hero-tagline">
            {taglinePillars.map((p, i) => (
              <span key={i}>
                {p.text}
                {i < taglinePillars.length - 1 && <span className="dot">·</span>}
              </span>
            ))}
          </p>
        </div>
        <div className="hero-scroll" aria-hidden="true">
          <span>Scroll</span>
          <div className="hero-scroll-line" />
        </div>
      </section>

      {/* CURRENT EXHIBITION */}
      {nowShowing && (
        <section className="exhibition-current" id="current">
          <div className="exhibition-current-inner">
            <div className="exhibition-image reveal">
              {mediaUrl(nowShowing.coverImage, 'hero') ? (
                <img
                  src={mediaUrl(nowShowing.coverImage, 'hero')!}
                  alt={mediaAlt(nowShowing.coverImage, nowShowing.title)}
                />
              ) : null}
              <span className="exhibition-image-label">Current Exhibition</span>
            </div>
            <div className="exhibition-details">
              <div className="section-label reveal">Now Showing</div>
              <div className="exhibition-dates reveal reveal-delay-1">
                {nowShowing.displayDates || 'On View'}
                {nowShowing.location ? ` — ${nowShowing.location}` : ''}
              </div>
              <h2 className="exhibition-title reveal reveal-delay-2">{nowShowing.title}</h2>
              {Array.isArray(nowShowing.artists) && nowShowing.artists.length > 0 && (
                <p className="exhibition-artist reveal reveal-delay-3">
                  {nowShowing.artists
                    .map((a: any) => (typeof a === 'object' ? a.name : ''))
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {nowShowing.description && (
                <p className="exhibition-desc reveal reveal-delay-4">
                  {richTextToPlainString(nowShowing.description, 280)}
                </p>
              )}
              <Link href="/exhibitions" className="btn btn-gold reveal reveal-delay-5">
                View Exhibition
                {ARROW_ICON}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* GALLERY STRIP */}
      {galleryStrip.length > 0 && (
        <section className="gallery-strip" aria-label="Gallery views">
          <div className="gallery-strip-inner">
            {[...galleryStrip, ...galleryStrip].map((g: any, i: number) => {
              const url = mediaUrl(g.image, 'card')
              if (!url) return null
              return (
                <img
                  key={i}
                  src={url}
                  alt={g.alt || mediaAlt(g.image, 'Mark Hachem Gallery')}
                  loading="lazy"
                />
              )
            })}
          </div>
        </section>
      )}

      {/* ARTISTS */}
      {featuredArtists.length > 0 && (
        <section className="artists" id="artists">
          <div className="artists-inner">
            <div className="artists-header">
              <div>
                <div className="section-label reveal" />
                <h2 className="section-heading reveal reveal-delay-1">Represented Artists</h2>
              </div>
              <Link href="/artists" className="btn reveal reveal-delay-2">
                View All {artistsTotalRes.totalDocs} Artists
                {ARROW_ICON}
              </Link>
            </div>
            <div className="artist-grid reveal">
              {featuredArtists.map((artist: any) => {
                const card = mediaUrl(artist.featuredArtwork, 'card') || mediaUrl(artist.portrait, 'card')
                const cardAlt = mediaAlt(
                  artist.featuredArtwork || artist.portrait,
                  `${artist.name}${artist.featuredArtworkTitle ? ' — ' + artist.featuredArtworkTitle : ''}`,
                )
                const workTitle = artist.featuredArtworkTitle || artist.portraitTitle
                const workMedium = artist.featuredArtworkMedium || artist.portraitMedium
                return (
                  <Link key={artist.id} href={`/artists/${artist.slug}`} className="artist-card">
                    <div className="artist-card-image">
                      {card ? <img src={card} alt={cardAlt} loading="lazy" /> : null}
                      <div className="artist-card-arrow">{ARTIST_CARD_ARROW}</div>
                    </div>
                    <p className="artist-card-name">{artist.name}</p>
                    {(artist.displayMeta || artist.nationality) && (
                      <p className="artist-card-role">{artist.displayMeta || artist.nationality}</p>
                    )}
                    {workTitle && (
                      <p className="artist-card-work">
                        {workTitle}
                        {workMedium && <span className="artist-card-medium">{workMedium}</span>}
                      </p>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ABOUT */}
      <section className="about" id="about">
        <div className="about-inner">
          <div className="about-left">
            <div className="section-label reveal">Philosophy</div>
            {aboutPortrait && (
              <div className="about-portrait reveal reveal-delay-1">
                <img src={aboutPortrait} alt={mediaAlt(homepage?.portrait, 'Mark Hachem — Founder')} />
              </div>
            )}
            {aboutQuote && (
              <blockquote className="about-quote reveal reveal-delay-2">“{aboutQuote}”</blockquote>
            )}
            <p className="about-attribution reveal reveal-delay-3">{aboutAttribution}</p>
          </div>
          <div className="about-right">
            <h3 className="reveal">{aboutHeading}</h3>
            <div className="reveal reveal-delay-1">
              <RichText content={homepage?.body} />
            </div>
            {milestones.length > 0 && (
              <div className="about-milestones reveal reveal-delay-4">
                {milestones.map((m, i) => (
                  <div className="milestone" key={i}>
                    <div className="milestone-year">{m.value}</div>
                    <div className="milestone-text">{m.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* NEWS */}
      {featuredNews.length > 0 && (
        <section className="news" id="news">
          <div className="news-inner">
            <div className="news-header">
              <div>
                <div className="section-label reveal">In the News</div>
                <h2 className="section-heading reveal reveal-delay-1">Highlights</h2>
              </div>
            </div>
            <div className="news-grid">
              {featuredNews.map((a: any, idx: number) => {
                const cover = mediaUrl(a.coverImage, 'card')
                const badgeClass =
                  a.badgeStyle === 'gold' ? 'news-card-badge gold' : 'news-card-badge'
                return (
                  <article key={a.id} className={`news-card reveal reveal-delay-${idx + 1}`}>
                    <div className="news-card-image">
                      {cover ? (
                        <img src={cover} alt={mediaAlt(a.coverImage, a.title)} loading="lazy" />
                      ) : null}
                      {a.badgeLabel && <span className={badgeClass}>{a.badgeLabel}</span>}
                    </div>
                    {(a.dateRange || a.location) && (
                      <div className="news-card-meta">
                        {a.dateRange && <span>{a.dateRange}</span>}
                        {a.location && <span>{a.location}</span>}
                      </div>
                    )}
                    <h3 className="news-card-title">{a.title}</h3>
                    {a.subtitle && <p className="news-card-subtitle">{a.subtitle}</p>}
                    {a.venue && (
                      <div className="news-card-venue">
                        <RichText content={a.venue} />
                      </div>
                    )}
                    {a.excerpt && <p className="news-card-excerpt">{a.excerpt}</p>}
                    <Link href={`/news/${a.slug}`} className="news-card-link">
                      Read more
                      {ARROW_ICON}
                    </Link>
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* PAST EXHIBITIONS */}
      {featuredPast.length > 0 && (
        <section className="exhibitions">
          <div className="exhibitions-inner">
            <div className="section-label reveal">Past Exhibitions</div>
            <h2 className="section-heading reveal reveal-delay-1">Recent Exhibitions</h2>
            <div className="exhibition-grid">
              {featuredPast.map((ex: any, idx: number) => (
                <Link
                  key={ex.id}
                  href="/exhibitions"
                  className={`exhibition-card reveal reveal-delay-${(idx % 6) + 1}`}
                >
                  <div className="exhibition-card-image">
                    {mediaUrl(ex.coverImage, 'card') ? (
                      <img
                        src={mediaUrl(ex.coverImage, 'card')!}
                        alt={mediaAlt(ex.coverImage, ex.title)}
                        className={ex.coverIsArtwork ? 'is-artwork' : undefined}
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <div className="exhibition-card-year">
                    {ex.displayDates || (ex.startDate ? new Date(ex.startDate).getFullYear() : '')}
                  </div>
                  <div className="exhibition-card-title">{ex.title}</div>
                  {ex.location && <div className="exhibition-card-location">{ex.location}</div>}
                </Link>
              ))}
            </div>
            <div className="exhibitions-cta reveal">
              <Link href="/exhibitions" className="btn btn-white">
                View Full Archive
                {ARROW_ICON}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* COLLECTION */}
      {collectionWorks.length > 0 && (
        <section className="collection" id="collection">
          <div className="collection-inner">
            <div className="collection-header">
              <div>
                <div className="section-label reveal">Collection</div>
                <h2 className="section-heading reveal reveal-delay-1">
                  Selected
                  <br />
                  <em>Available Works</em>
                </h2>
              </div>
              <a
                href={settings?.socials?.artsy || 'https://www.artsy.net/partner/mark-hachem-gallery/works'}
                target="_blank"
                rel="noopener noreferrer"
                className="btn reveal reveal-delay-2"
              >
                View on Artsy
                {ARROW_ICON}
              </a>
            </div>
            <div className="collection-grid">
              {collectionWorks.map((cw: any, i: number) => {
                const artist = typeof cw.artist === 'object' ? cw.artist : null
                const slug = artist?.slug || ''
                const url = mediaUrl(cw.image, 'card')
                return (
                  <Link
                    key={i}
                    href={slug ? `/artists/${slug}` : '#'}
                    className={`collection-item reveal reveal-delay-${(i % 4) + 1}`}
                  >
                    <div className="collection-item-image">
                      {url ? <img src={url} alt={artist?.name || cw.title || ''} loading="lazy" /> : null}
                    </div>
                    <p className="collection-item-artist">{artist?.name || ''}</p>
                    {cw.title && <p className="collection-item-title">{cw.title}</p>}
                    {cw.medium && <p className="collection-item-medium">{cw.medium}</p>}
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* LATEST — CURRENT & UPCOMING (rich-card fairs) */}
      {latestFairsRes.docs.length > 0 && (
        <section className="latest" id="latest">
          <div className="latest-inner">
            <div className="latest-header">
              <div className="section-label reveal">Art Fairs</div>
              <h2 className="section-heading reveal reveal-delay-1">
                Current &amp; <em>Upcoming</em>
              </h2>
            </div>
            <div className="latest-grid">
              {latestFairsRes.docs.map((fair: any, i: number) => {
                const cover = mediaUrl(fair.coverImage, 'hero') || mediaUrl(fair.coverImage, 'card')
                const statusLabel =
                  fair.status === 'upcoming'
                    ? 'Upcoming'
                    : fair.status === 'current'
                      ? 'Now'
                      : 'Past'
                return (
                  <article key={fair.id} className={`latest-card reveal reveal-delay-${i + 1}`}>
                    <div className="latest-card-image">
                      {cover ? (
                        <img src={cover} alt={mediaAlt(fair.coverImage, fair.name)} loading="lazy" />
                      ) : null}
                      <span className="latest-card-status">{statusLabel}</span>
                    </div>
                    <div className="latest-card-body">
                      <div className="latest-card-meta">
                        {fair.dateRange && <span>{fair.dateRange}</span>}
                        {fair.city && <span>{fair.city}</span>}
                      </div>
                      <h3 className="latest-card-title">{fair.name}</h3>
                      {fair.booth && (
                        <p className="latest-card-booth">
                          {SITE_NAME} · <strong>Booth {fair.booth}</strong>
                        </p>
                      )}
                      {fair.venue && <p className="latest-card-venue">{fair.venue}</p>}
                      {Array.isArray(fair.dateRows) && fair.dateRows.length > 0 && (
                        <dl className="latest-card-dates">
                          {fair.dateRows.map((row: any, j: number) => (
                            <div key={j}>
                              <dt>{row.label}</dt>
                              <dd>{row.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ART FAIRS GRID */}
      {fairsGridRes.docs.length > 0 && (
        <section className="fairs" id="fairs">
          <div className="fairs-inner">
            <div className="section-label reveal" />
            <h2 className="section-heading reveal reveal-delay-1">Art Fairs</h2>
            <div className="fairs-grid">
              {fairsGridRes.docs.map((fair: any, i: number) => {
                const logo = mediaUrl(fair.logo, 'card') || mediaUrl(fair.logo, 'thumbnail')
                return (
                  <div key={fair.id} className={`fair-card reveal reveal-delay-${(i % 4) + 1}`}>
                    <div className="fair-card-image">
                      <div className="fair-logo-placeholder">
                        {logo && <img src={logo} alt={`${fair.name} logo`} loading="lazy" />}
                      </div>
                    </div>
                    <div className="fair-card-info">
                      <div className="fair-card-name">{fair.name}</div>
                      {fair.location && <div className="fair-card-location">{fair.location}</div>}
                      {fair.description && <div className="fair-card-desc">{fair.description}</div>}
                      {fair.participationLine && (
                        <div className="fair-card-year">{fair.participationLine}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* CONTACT */}
      <section className="contact" id="contact">
        <div className="contact-inner">
          <div className="contact-heading-area">
            <div className="section-label reveal">Visit Us</div>
            <h2 className="section-heading reveal reveal-delay-1">
              {locations.length > 1 ? 'Three Cities,' : 'Visit'}
              <br />
              <em>One Vision</em>
            </h2>
          </div>
          {locations.map((loc: any, i: number) => {
            const addresses: string[] = (loc.addresses || [])
              .map((a: any) => a?.lines)
              .filter((s: string) => !!s)
            const phones: string[] = (loc.phones || [])
              .map((p: any) => p?.value)
              .filter((s: string) => !!s)
            return (
              <div key={loc.city || i} className={`contact-location reveal reveal-delay-${i + 2}`}>
                <h3 className="contact-city">{loc.city}</h3>
                <div className="contact-detail">
                  {addresses.length > 0 ? (
                    <>
                      <strong>Address</strong>
                      {addresses.map((lines, j) => (
                        <span key={j}>
                          {j > 0 && <br />}
                          {j > 0 && <br />}
                          {lines.split('\n').map((line, k) => (
                            <span key={k}>
                              {k > 0 && <br />}
                              {line}
                            </span>
                          ))}
                        </span>
                      ))}
                    </>
                  ) : loc.presenceText ? (
                    <>
                      <strong>Presence</strong>
                      {loc.presenceText}
                    </>
                  ) : null}
                  {phones.length > 0 && (
                    <>
                      <strong>Telephone</strong>
                      {phones.map((p, j) => (
                        <span key={j}>
                          {j > 0 && <br />}
                          <a href={`tel:${p.replace(/[^+\d]/g, '')}`}>{p}</a>
                        </span>
                      ))}
                    </>
                  )}
                  {loc.email && (
                    <>
                      <strong>Email</strong>
                      <a href={`mailto:${loc.email}`}>{loc.email}</a>
                    </>
                  )}
                  {loc.hours && (
                    <>
                      <strong>Hours</strong>
                      {loc.hours}
                    </>
                  )}
                </div>
              </div>
            )
          })}
          <div className="contact-inquiry reveal">
            <p>
              {contactCta.heading}
              <span>{contactCta.subheading}</span>
            </p>
            <a href={contactCta.buttonHref} className="btn btn-gold">
              {contactCta.buttonLabel}
              {ARROW_ICON}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
