import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayloadClient } from '@/lib/payload'
import { mediaUrl, mediaAlt } from '@/lib/media'
import { SITE_URL, SITE_NAME } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Events',
  description:
    'Events from Mark Hachem Gallery — exhibitions, openings, museum programmes, and artist studio visits.',
  alternates: { canonical: '/events' },
  openGraph: {
    title: `Events — ${SITE_NAME}`,
    description: 'Events and gatherings from Mark Hachem Gallery.',
    url: `${SITE_URL}/events`,
    type: 'website',
  },
}

export default async function EventsIndexPage() {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'events',
    limit: 100,
    sort: '-publishedDate',
    depth: 1,
  })

  const events = res.docs

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Events', item: `${SITE_URL}/events` },
    ],
  }

  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Events — ${SITE_NAME}`,
    url: `${SITE_URL}/events`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: events.length,
      itemListElement: events.map((a: any, i: number) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Event',
          name: a.title,
          url: `${SITE_URL}/events/${a.slug}`,
          ...(a.publishedDate ? { startDate: a.publishedDate } : {}),
          ...(a.location ? { location: { '@type': 'Place', name: a.location } } : {}),
        },
      })),
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collection) }}
      />
      <section className="page-hero">
        <div className="page-hero-inner">
          <div className="page-hero-label"></div>
          <h1>Events</h1>
        </div>
      </section>
      <section className="news">
        <div className="news-inner">
          <div className="news-grid">
            {events.map((a: any) => {
              const cover = mediaUrl(a.coverImage, 'card')
              const badgeClass = a.badgeStyle === 'gold' ? 'news-card-badge gold' : 'news-card-badge'
              return (
                <article key={a.id} className="news-card reveal">
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
                  <h2 className="news-card-title">{a.title}</h2>
                  {a.subtitle && <p className="news-card-subtitle">{a.subtitle}</p>}
                  {a.excerpt && <p className="news-card-excerpt">{a.excerpt}</p>}
                  <Link href={`/events/${a.slug}`} className="news-card-link">
                    Read more
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
