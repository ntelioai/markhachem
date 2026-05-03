import { getPayloadClient } from '@/lib/payload'
import { NavClient, type NavLink } from './NavClient'

const FALLBACK_LINKS: NavLink[] = [
  { label: 'About', href: '/#about' },
  { label: 'Artists', href: '/artists' },
  { label: 'Exhibitions', href: '/exhibitions' },
  { label: 'Art Fairs', href: '/#fairs' },
  { label: 'News', href: '/news' },
]

export async function Nav() {
  const payload = await getPayloadClient()
  const settings = await payload.findGlobal({ slug: 'settings' }).catch(() => null)
  const fromSettings = (settings?.navigation?.links ?? []).filter(
    (l: any) => l && l.label && l.href,
  )
  const links: NavLink[] = fromSettings.length
    ? fromSettings.map((l: any) => ({
        label: l.label,
        href: l.href,
        openInNewTab: !!l.openInNewTab,
      }))
    : FALLBACK_LINKS
  return <NavClient links={links} />
}
