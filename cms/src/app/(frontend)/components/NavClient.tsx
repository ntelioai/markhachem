'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export type NavLink = {
  label: string
  href: string
  openInNewTab?: boolean | null
}

export function NavClient({
  links,
  ctaLabel = 'CONTACT',
  ctaHref = '#contact',
}: {
  links: NavLink[]
  ctaLabel?: string
  ctaHref?: string
}) {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!isHome) return
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    if (!href.startsWith('/')) return false
    if (href === '/') return pathname === '/'
    if (href.includes('#')) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  const classes = [
    'nav',
    !isHome && 'solid',
    scrolled && 'scrolled',
    mobileOpen && 'mobile-open',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <nav className={classes} id="nav">
      <Link href="/" className="nav-logo" aria-label="Mark Hachem Gallery — Home">
        <img
          src="/assets/images/mark-hachem-logo-white.png"
          alt="Mark Hachem Gallery"
          className="nav-logo-white"
        />
        <img
          src="/assets/images/mark-hachem-logo.png"
          alt="Mark Hachem Gallery"
          className="nav-logo-dark"
        />
      </Link>
      <ul className="nav-links">
        {links.map((link) => (
          <li key={`${link.label}-${link.href}`}>
            <Link
              href={link.href}
              className={isActive(link.href) ? 'active' : ''}
              {...(link.openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {link.label}
            </Link>
          </li>
        ))}
        <li className="nav-mobile-cta">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </li>
      </ul>
      <Link href={ctaHref} className="nav-cta">
        {ctaLabel}
      </Link>
      <div
        className="nav-toggle"
        role="button"
        aria-label="Toggle navigation"
        aria-expanded={mobileOpen}
        tabIndex={0}
        onClick={() => setMobileOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setMobileOpen((v) => !v)
          }
        }}
      >
        <span />
        <span />
        <span />
      </div>
    </nav>
  )
}
