'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function ScrollReveal() {
  const pathname = usePathname()
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    )

    const scan = () => {
      document
        .querySelectorAll<HTMLElement>('.reveal:not(.visible)')
        .forEach((el) => observer.observe(el))
    }
    scan()

    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true })

    window.addEventListener('hashchange', scan)
    return () => {
      observer.disconnect()
      mo.disconnect()
      window.removeEventListener('hashchange', scan)
    }
  }, [pathname])
  return null
}
