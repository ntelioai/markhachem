export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.markhachem.com').replace(/\/$/, '')
export const SITE_NAME = 'Mark Hachem Gallery'
export const SITE_TAGLINE = 'Kinetic Art · Arab Modernism · Contemporary Art'
export const SITE_DESCRIPTION =
  'Mark Hachem Gallery — a platform for kinetic art, Arab modernism, and contemporary art. Founded in Paris, 1996. Locations in Paris, New York, and Beirut.'
export const DEFAULT_OG_IMAGE = '/assets/images/og-image.jpg'

export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL
  if (path.startsWith('http')) return path
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}
