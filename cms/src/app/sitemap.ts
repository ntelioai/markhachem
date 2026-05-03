import type { MetadataRoute } from 'next'
import { getPayloadClient } from '@/lib/payload'
import { SITE_URL } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayloadClient()
  const [artistsRes, newsRes] = await Promise.all([
    payload.find({ collection: 'artists', limit: 500, depth: 0, select: { slug: true, updatedAt: true } as any }),
    payload.find({ collection: 'news', limit: 200, depth: 0, select: { slug: true, updatedAt: true } as any }),
  ])

  const now = new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/artists`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/exhibitions`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/news`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/mentions-legales`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  const artistRoutes: MetadataRoute.Sitemap = artistsRes.docs
    .filter((d: any) => d.slug)
    .map((d: any) => ({
      url: `${SITE_URL}/artists/${d.slug}`,
      lastModified: d.updatedAt ? new Date(d.updatedAt) : now,
      changeFrequency: 'monthly',
      priority: 0.7,
    }))

  const newsRoutes: MetadataRoute.Sitemap = newsRes.docs
    .filter((d: any) => d.slug)
    .map((d: any) => ({
      url: `${SITE_URL}/news/${d.slug}`,
      lastModified: d.updatedAt ? new Date(d.updatedAt) : now,
      changeFrequency: 'monthly',
      priority: 0.7,
    }))

  return [...staticRoutes, ...artistRoutes, ...newsRoutes]
}
