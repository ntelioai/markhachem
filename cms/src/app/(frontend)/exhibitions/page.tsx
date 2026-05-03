import type { Metadata } from 'next'
import { getPayloadClient } from '@/lib/payload'
import { mediaUrl, mediaAlt } from '@/lib/media'
import { SITE_URL, SITE_NAME } from '@/lib/seo'
import { richTextToPlainString } from '@/lib/richText'
import { ExhibitionsFilter, type ExhibitionCard } from './ExhibitionsFilter'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Exhibitions',
  description:
    'Three decades of exhibitions at Mark Hachem Gallery — solo shows, group presentations, and historic surveys across Paris, Beirut, and New York.',
  alternates: { canonical: '/exhibitions' },
  openGraph: {
    title: `Exhibitions — ${SITE_NAME}`,
    description: 'Exhibition archive at Mark Hachem Gallery.',
    url: `${SITE_URL}/exhibitions`,
    type: 'website',
  },
}

export default async function ExhibitionsPage() {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'exhibitions',
    limit: 500,
    sort: '-startDate',
    depth: 1,
  })

  const exhibitions: ExhibitionCard[] = res.docs.map((ex: any) => ({
    id: ex.id,
    title: ex.title,
    city: ex.city,
    displayDates: ex.displayDates,
    location: ex.location,
    description: richTextToPlainString(ex.description, 200),
    coverUrl: mediaUrl(ex.coverImage, 'card'),
    coverAlt: mediaAlt(ex.coverImage, ex.title),
    year: ex.startDate ? String(new Date(ex.startDate).getFullYear()) : null,
  }))

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Exhibitions', item: `${SITE_URL}/exhibitions` },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <section className="page-hero">
        <div className="page-hero-inner">
          <div className="page-hero-label">Archive</div>
          <h1>Exhibitions</h1>
          <p>
            Three decades of exhibitions at Mark Hachem Gallery, from historic retrospectives to solo
            shows by contemporary voices, across Paris, Beirut, and New York.
          </p>
        </div>
      </section>
      <section className="exhibitions-archive">
        <div className="exhibitions-archive-inner">
          <ExhibitionsFilter exhibitions={exhibitions} />
        </div>
      </section>
    </>
  )
}
