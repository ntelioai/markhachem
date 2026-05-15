'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

export type ArtistCard = {
  id: number | string
  slug: string
  name: string
  displayMeta?: string | null
  portraitTitle?: string | null
  portraitMedium?: string | null
  category?: 'modern' | 'contemporary' | null
  portraitUrl?: string | null
  portraitAlt?: string
}

export function ArtistsFilter({ artists }: { artists: ArtistCard[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query) return artists
    const q = query.toLowerCase()
    return artists.filter((a) => {
      const hay = `${a.name} ${a.displayMeta ?? ''} ${a.portraitTitle ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [artists, query])

  return (
    <>
      <div className="filters">
        <div className="filter-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search artists"
          />
        </div>
      </div>
      <p className="results-count">
        {filtered.length} {filtered.length === 1 ? 'artist' : 'artists'}
      </p>
      <div className="artist-grid">
        {filtered.map((a) => (
          <Link key={a.id} href={`/artists/${a.slug}`} className="artist-card">
            <div className="artist-card-image">
              {a.portraitUrl ? (
                <img src={a.portraitUrl} alt={a.portraitAlt || a.name} loading="lazy" />
              ) : null}
              <div className="artist-card-arrow">
                <svg viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            <h3 className="artist-card-name">{a.name}</h3>
            {a.displayMeta && <p className="artist-card-sub">{a.displayMeta}</p>}
            {a.portraitTitle && (
              <p className="artist-card-artwork">
                <em>{a.portraitTitle}</em>
                {a.portraitMedium && <span className="artist-card-medium">{a.portraitMedium}</span>}
              </p>
            )}
          </Link>
        ))}
      </div>
    </>
  )
}
