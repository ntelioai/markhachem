import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { mediaUrl, mediaAlt } from '@/lib/media'
import { SITE_URL, SITE_NAME } from '@/lib/seo'
import { RichText, richTextToPlainString } from '@/lib/richText'

type Params = { slug: string }

async function fetchArticle(slug: string) {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'news',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  })
  return res.docs[0] ?? null
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const article: any = await fetchArticle(slug)
  if (!article) return {}
  const desc =
    richTextToPlainString(article.body, 200) ||
    article.excerpt ||
    `${article.title} — News from ${SITE_NAME}.`
  const ogImage = mediaUrl(article.coverImage, 'hero')
  const url = `${SITE_URL}/news/${article.slug}`
  return {
    title: article.title,
    description: desc,
    alternates: { canonical: `/news/${article.slug}` },
    openGraph: {
      type: 'article',
      title: `${article.title} — ${SITE_NAME}`,
      description: desc,
      url,
      images: ogImage ? [{ url: ogImage, alt: mediaAlt(article.coverImage, article.title) }] : undefined,
      ...(article.publishedDate ? { publishedTime: article.publishedDate } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${article.title} — ${SITE_NAME}`,
      description: desc,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

export default async function NewsArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const article: any = await fetchArticle(slug)
  if (!article) notFound()

  const cover = mediaUrl(article.coverImage, 'hero')
  const description =
    richTextToPlainString(article.body, 500) || article.excerpt || article.subtitle || ''

  const articleSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    url: `${SITE_URL}/news/${article.slug}`,
    description,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/images/mark-hachem-logo.png` },
    },
  }
  if (article.publishedDate) articleSchema.datePublished = article.publishedDate
  if (cover) articleSchema.image = cover

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'News', item: `${SITE_URL}/news` },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.title,
        item: `${SITE_URL}/news/${article.slug}`,
      },
    ],
  }

  const badgeClass = article.badgeStyle === 'gold' ? 'news-card-badge gold' : 'news-card-badge'

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <article className="news-page">
        <div className="profile-breadcrumb" style={{ marginBottom: '1.5rem' }}>
          <Link href="/news">← News</Link>
        </div>
        {cover && (
          <div className="news-page-cover">
            <img src={cover} alt={mediaAlt(article.coverImage, article.title)} />
            {article.badgeLabel && <span className={badgeClass}>{article.badgeLabel}</span>}
          </div>
        )}
        {(article.dateRange || article.location) && (
          <div className="news-page-meta">
            {article.dateRange && <span>{article.dateRange}</span>}
            {article.location && <span>{article.location}</span>}
          </div>
        )}
        <h1>{article.title}</h1>
        {article.subtitle && <p className="news-page-subtitle">{article.subtitle}</p>}
        {article.venue && (
          <div className="news-page-venue">
            <RichText content={article.venue} />
          </div>
        )}
        <div className="news-page-body">
          <RichText content={article.body} />
        </div>
      </article>

      <div className="back-link">
        <Link href="/news">↑ All News</Link>
      </div>
    </>
  )
}

export const dynamic = 'force-dynamic'
