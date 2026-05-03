'use client'

import { useMemo, useState } from 'react'

export type ExhibitionCard = {
  id: number | string
  title: string
  city?: string | null
  displayDates?: string | null
  location?: string | null
  description?: string | null
  coverUrl?: string | null
  coverAlt?: string
  year?: string | null
}

const CITIES = [
  { label: 'All', value: 'all' },
  { label: 'Paris', value: 'paris' },
  { label: 'Beirut', value: 'beirut' },
  { label: 'New York', value: 'new-york' },
]

export function ExhibitionsFilter({ exhibitions }: { exhibitions: ExhibitionCard[] }) {
  const [city, setCity] = useState('all')
  const [year, setYear] = useState('all')
  const [query, setQuery] = useState('')

  const years = useMemo(() => {
    const set = new Set<string>()
    for (const ex of exhibitions) if (ex.year) set.add(ex.year)
    return Array.from(set).sort().reverse()
  }, [exhibitions])

  const filtered = useMemo(() => {
    return exhibitions.filter((ex) => {
      if (city !== 'all' && ex.city !== city) return false
      if (year !== 'all' && ex.year !== year) return false
      if (query) {
        const q = query.toLowerCase()
        const hay = `${ex.title} ${ex.description ?? ''} ${ex.location ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [exhibitions, city, year, query])

  return (
    <>
      <div className="filters">
        <div className="filter-group">
          {CITIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`filter-btn${city === c.value ? ' active' : ''}`}
              onClick={() => setCity(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="filter-group">
          <button
            type="button"
            className={`filter-btn${year === 'all' ? ' active' : ''}`}
            onClick={() => setYear('all')}
          >
            All years
          </button>
          {years.slice(0, 10).map((y) => (
            <button
              key={y}
              type="button"
              className={`filter-btn${year === y ? ' active' : ''}`}
              onClick={() => setYear(y)}
            >
              {y}
            </button>
          ))}
        </div>
        <div className="filter-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search exhibitions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search exhibitions"
          />
        </div>
      </div>
      <p className="results-count">
        {filtered.length} {filtered.length === 1 ? 'exhibition' : 'exhibitions'}
      </p>
      <div className="exh-grid">
        {filtered.map((ex) => (
          <article key={ex.id} className="exh-card">
            <div className="exh-card-image">
              {ex.coverUrl ? (
                <img src={ex.coverUrl} alt={ex.coverAlt || ex.title} loading="lazy" />
              ) : (
                <div className="no-image-placeholder" />
              )}
            </div>
            {ex.displayDates && <div className="exh-card-meta">{ex.displayDates}</div>}
            <h3 className="exh-card-title">{ex.title}</h3>
            {ex.location && <p className="exh-card-location">{ex.location}</p>}
            {ex.description && <p className="exh-card-desc">{ex.description}</p>}
          </article>
        ))}
      </div>
    </>
  )
}
