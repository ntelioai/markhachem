import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayloadClient } from '@/lib/payload'
import { mediaUrl, mediaAlt } from '@/lib/media'
import { SITE_URL, SITE_NAME } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'News',
  description:
    'News from Mark Hachem Gallery — major retrospectives, biennale appearances, and milestone exhibitions of represented artists.',
  alternates: { canonical: '/news' },
  openGraph: {
    title: `News — ${SITE_NAME}`,
    description: 'News and announcements from Mark Hachem Gallery.',
    url: `${SITE_URL}/news`,
    type: 'website',
  },
}

export default async function NewsIndexPage() {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'news',
    limit: 100,
    sort: '-publishedDate',
    depth: 1,
  })

  const articles = res.docs

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'News', item: `${SITE_URL}/news` },
    ],
  }

  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `News — ${SITE_NAME}`,
    url: `${SITE_URL}/news`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: articles.length,
      itemListElement: articles.map((a: any, i: number) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Article',
          headline: a.title,
          url: `${SITE_URL}/news/${a.slug}`,
          datePublished: a.publishedDate,
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
          <div className="page-hero-label">In the News</div>
          <h1>News</h1>
          <p>
            Highlights from the gallery&apos;s programme — major retrospectives, biennale appearances,
            and milestone exhibitions of represented artists.
          </p>
        </div>
      </section>
      <section className="news">
        <div className="news-inner">
          <div className="news-grid">
            {articles.map((a: any) => {
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
                  <Link href={`/news/${a.slug}`} className="news-card-link">
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
