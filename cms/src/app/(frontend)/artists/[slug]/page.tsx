import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { mediaUrl, mediaAlt } from '@/lib/media'
import { SITE_URL, SITE_NAME } from '@/lib/seo'
import { RichText, richTextToPlainString } from '@/lib/richText'

type Params = { slug: string }

async function fetchArtist(slug: string) {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'artists',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  })
  return res.docs[0] ?? null
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const artist: any = await fetchArtist(slug)
  if (!artist) return {}
  const meta = artist.displayMeta || artist.nationality || ''
  const desc =
    richTextToPlainString(artist.bio, 200) ||
    `${artist.name} — artist represented by Mark Hachem Gallery.${meta ? ` ${meta}.` : ''}`
  const ogImage = mediaUrl(artist.portrait, 'hero')
  const url = `${SITE_URL}/artists/${artist.slug}`
  return {
    title: artist.name,
    description: desc,
    alternates: { canonical: `/artists/${artist.slug}` },
    openGraph: {
      type: 'profile',
      title: `${artist.name} — ${SITE_NAME}`,
      description: desc,
      url,
      images: ogImage ? [{ url: ogImage, alt: mediaAlt(artist.portrait, artist.name) }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${artist.name} — ${SITE_NAME}`,
      description: desc,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

export default async function ArtistPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const artist: any = await fetchArtist(slug)
  if (!artist) notFound()

  const portraitUrl = mediaUrl(artist.portrait, 'hero')
  const portraitIsArtwork = Boolean(artist.portraitTitle)

  const personSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: artist.name,
    url: `${SITE_URL}/artists/${artist.slug}`,
    description: richTextToPlainString(artist.bio, 500) || undefined,
  }
  if (artist.nationality) personSchema.nationality = artist.nationality
  if (artist.birthYear) personSchema.birthDate = String(artist.birthYear)
  if (artist.deathYear) personSchema.deathDate = String(artist.deathYear)
  if (portraitUrl) personSchema.image = portraitUrl
  const sameAs = Array.isArray(artist.links)
    ? artist.links.map((l: any) => l?.url).filter((u: string | undefined): u is string => !!u)
    : []
  if (sameAs.length) personSchema.sameAs = sameAs

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Artists', item: `${SITE_URL}/artists` },
      {
        '@type': 'ListItem',
        position: 3,
        name: artist.name,
        item: `${SITE_URL}/artists/${artist.slug}`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <section className="profile-hero">
        <div className="profile-hero-inner">
          <div className="profile-breadcrumb">
            <Link href="/artists">← Artists</Link>
          </div>
          <h1>{artist.name}</h1>
          {(artist.displayMeta || artist.nationality) && (
            <div className="profile-meta">{artist.displayMeta || artist.nationality}</div>
          )}
        </div>
      </section>

      <section className="profile-body">
        <div className="profile-inner">
          <aside className="profile-portrait reveal">
            <div className="profile-portrait-frame">
              {portraitUrl && (
                <img
                  src={portraitUrl}
                  alt={mediaAlt(artist.portrait, artist.name)}
                  className={portraitIsArtwork ? 'is-artwork' : undefined}
                />
              )}
            </div>
            {(artist.portraitTitle || artist.portraitMedium) && (
              <div className="profile-portrait-caption">
                {artist.portraitTitle && (
                  <span className="portrait-title">
                    <em>{artist.portraitTitle}</em>
                  </span>
                )}
                {artist.portraitMedium && (
                  <span className="portrait-medium">{artist.portraitMedium}</span>
                )}
              </div>
            )}
          </aside>
          <article className="profile-text reveal">
            <RichText content={artist.bio} />
            <div className="profile-divider" />
          </article>
        </div>
      </section>

      {Array.isArray(artist.additionalArtworks) && artist.additionalArtworks.length > 0 && (
        <section className="profile-section profile-artworks-section">
          <div className="profile-section-inner">
            <h2 className="profile-section-title">Selected Works</h2>
            <div className="profile-artworks-grid">
              {artist.additionalArtworks.map((a: any, i: number) => {
                const url = mediaUrl(a.image, 'hero')
                if (!url) return null
                return (
                  <figure key={a.id ?? i} className="profile-artwork reveal">
                    <div className="profile-artwork-frame">
                      <img src={url} alt={mediaAlt(a.image, a.title || artist.name)} loading="lazy" />
                    </div>
                    {(a.title || a.medium) && (
                      <figcaption className="profile-artwork-caption">
                        {a.title && <span className="portrait-title"><em>{a.title}</em></span>}
                        {a.medium && <span className="portrait-medium">{a.medium}</span>}
                      </figcaption>
                    )}
                  </figure>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {artist.cv && (
        <section className="profile-section profile-cv-section">
          <div className="profile-section-inner">
            <h2 className="profile-section-title">Curriculum Vitae</h2>
            <div className="profile-cv">
              <RichText content={artist.cv} />
            </div>
          </div>
        </section>
      )}

      {Array.isArray(artist.publications) && artist.publications.length > 0 && (
        <section className="profile-section profile-publications-section">
          <div className="profile-section-inner">
            <h2 className="profile-section-title">Publications</h2>
            <ul className="profile-link-list">
              {artist.publications.map((p: any, i: number) => (
                <li key={p.id ?? i} className="profile-link-item">
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    <span className="profile-link-label">{p.label}</span>
                    {p.type && <span className="profile-link-type">{p.type}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {Array.isArray(artist.links) && artist.links.length > 0 && (
        <section className="profile-section profile-links-section">
          <div className="profile-section-inner">
            <h2 className="profile-section-title">Links</h2>
            <ul className="profile-link-list">
              {artist.links.map((l: any, i: number) => (
                <li key={l.id ?? i} className="profile-link-item">
                  <a href={l.url} target="_blank" rel="noopener noreferrer">
                    <span className="profile-link-label">{l.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="profile-cta">
        <span className="profile-cta-label">Inquire</span>
        <h2>
          Works by <em>{artist.name}</em>
        </h2>
        <p>
          For availability, pricing, or to arrange a private viewing of works by {artist.name}, please
          contact the gallery.
        </p>
        <Link href="/#contact">Request Information</Link>
      </section>

      <div className="back-link">
        <Link href="/artists">↑ All Artists</Link>
      </div>
    </>
  )
}

export const dynamic = 'force-dynamic'
