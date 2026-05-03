import type { Metadata } from 'next'
import { getPayloadClient } from '@/lib/payload'
import { mediaUrl, mediaAlt } from '@/lib/media'
import { SITE_URL, SITE_NAME } from '@/lib/seo'
import { ArtistsFilter, type ArtistCard } from './ArtistsFilter'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Artists',
  description:
    'Artists represented by Mark Hachem Gallery — from kinetic and Op-Art masters to contemporary voices across the Arab world and beyond.',
  alternates: { canonical: '/artists' },
  openGraph: {
    title: `Artists — ${SITE_NAME}`,
    description:
      'The full roster of artists represented by Mark Hachem Gallery — Modern and Contemporary.',
    url: `${SITE_URL}/artists`,
    type: 'website',
  },
}

export default async function ArtistsPage() {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'artists',
    limit: 200,
    sort: 'name',
    depth: 1,
  })

  const artists: ArtistCard[] = res.docs.map((a: any) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    displayMeta: a.displayMeta || a.nationality || null,
    portraitTitle: a.portraitTitle,
    portraitMedium: a.portraitMedium,
    category: a.category,
    portraitUrl: mediaUrl(a.portrait, 'card'),
    portraitAlt: mediaAlt(a.portrait, a.name),
  }))

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Artists', item: `${SITE_URL}/artists` },
    ],
  }

  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Artists — Mark Hachem Gallery',
    url: `${SITE_URL}/artists`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: artists.length,
      itemListElement: artists.slice(0, 25).map((a, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: { '@type': 'Person', name: a.name, url: `${SITE_URL}/artists/${a.slug}` },
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
          <div className="page-hero-label">Represented</div>
          <h1>Artists</h1>
          <p>
            A growing roster of Modern and Contemporary artists whose work the gallery has championed
            since 1996 — from pioneers of kinetic art to emerging voices reshaping the region&apos;s
            artistic conversation.
          </p>
        </div>
      </section>
      <section className="artists-archive">
        <div className="artists-archive-inner">
          <ArtistsFilter artists={artists} />
        </div>
      </section>
    </>
  )
}
