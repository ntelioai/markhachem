import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { mediaUrl, mediaAlt } from '@/lib/media'
import { SITE_URL, SITE_NAME } from '@/lib/seo'
import { RichText, richTextToPlainString } from '@/lib/richText'

type Params = { slug: string }

async function fetchEvent(slug: string) {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  })
  return res.docs[0] ?? null
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const event: any = await fetchEvent(slug)
  if (!event) return {}
  const desc =
    richTextToPlainString(event.body, 200) ||
    event.excerpt ||
    `${event.title} — Event at ${SITE_NAME}.`
  const ogImage = mediaUrl(event.coverImage, 'hero')
  const url = `${SITE_URL}/events/${event.slug}`
  return {
    title: event.title,
    description: desc,
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: {
      type: 'article',
      title: `${event.title} — ${SITE_NAME}`,
      description: desc,
      url,
      images: ogImage ? [{ url: ogImage, alt: mediaAlt(event.coverImage, event.title) }] : undefined,
      ...(event.publishedDate ? { publishedTime: event.publishedDate } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${event.title} — ${SITE_NAME}`,
      description: desc,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

export default async function EventPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const event: any = await fetchEvent(slug)
  if (!event) notFound()

  const cover = mediaUrl(event.coverImage, 'hero')
  const description =
    richTextToPlainString(event.body, 500) || event.excerpt || event.subtitle || ''

  const eventSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    url: `${SITE_URL}/events/${event.slug}`,
    description,
    organizer: { '@type': 'Organization', name: SITE_NAME },
  }
  if (event.publishedDate) eventSchema.startDate = event.publishedDate
  if (event.location) eventSchema.location = { '@type': 'Place', name: event.location }
  if (cover) eventSchema.image = cover

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Events', item: `${SITE_URL}/events` },
      {
        '@type': 'ListItem',
        position: 3,
        name: event.title,
        item: `${SITE_URL}/events/${event.slug}`,
      },
    ],
  }

  const badgeClass = event.badgeStyle === 'gold' ? 'news-card-badge gold' : 'news-card-badge'

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <article className="news-page">
        <div className="profile-breadcrumb" style={{ marginBottom: '1.5rem' }}>
          <Link href="/events">← Events</Link>
        </div>
        {cover && (
          <div className="news-page-cover">
            <img src={cover} alt={mediaAlt(event.coverImage, event.title)} />
            {event.badgeLabel && <span className={badgeClass}>{event.badgeLabel}</span>}
          </div>
        )}
        {(event.dateRange || event.location) && (
          <div className="news-page-meta">
            {event.dateRange && <span>{event.dateRange}</span>}
            {event.location && <span>{event.location}</span>}
          </div>
        )}
        <h1>{event.title}</h1>
        {event.subtitle && <p className="news-page-subtitle">{event.subtitle}</p>}
        {event.venue && (
          <div className="news-page-venue">
            <RichText content={event.venue} />
          </div>
        )}
        <div className="news-page-body">
          <RichText content={event.body} />
        </div>
      </article>

      <div className="back-link">
        <Link href="/events">↑ All Events</Link>
      </div>
    </>
  )
}

export const dynamic = 'force-dynamic'
