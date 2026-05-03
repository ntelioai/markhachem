import React from 'react'
import type { ServerProps } from 'payload'
import { getPayloadClient } from '../../lib/payload'
import { mediaUrl, mediaAlt } from '../../lib/media'

function formatExhibitionDate(displayDates?: string | null, startDate?: string | null, endDate?: string | null) {
  if (displayDates) return displayDates
  if (!startDate) return ''
  const start = new Date(startDate)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  if (!endDate) return start.toLocaleDateString('en-US', opts)
  const end = new Date(endDate)
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', opts)}`
}

function cityLabel(city?: string | null) {
  if (!city) return ''
  return city.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

export const BeforeDashboard: React.FC<ServerProps> = async (props) => {
  const payload = await getPayloadClient()
  const greetingName = props.user?.email ? props.user.email.split('@')[0] : 'there'

  const [exhibitionsResp, artistsResp, exhibitionsCount, artistsCount, mediaCount, newsCount] =
    await Promise.all([
      payload.find({
        collection: 'exhibitions',
        limit: 4,
        depth: 1,
        sort: '-startDate',
      }),
      payload.find({
        collection: 'artists',
        where: { featured: { equals: true } },
        limit: 6,
        depth: 1,
        sort: 'sortOrder',
      }),
      payload.count({ collection: 'exhibitions' }),
      payload.count({ collection: 'artists' }),
      payload.count({ collection: 'media' }),
      payload.count({ collection: 'news' }).catch(() => ({ totalDocs: 0 })),
    ])

  const exhibitions = exhibitionsResp.docs as Array<{
    id: string | number
    slug?: string | null
    title: string
    city?: string | null
    startDate?: string | null
    endDate?: string | null
    displayDates?: string | null
    coverImage?: unknown
  }>

  const artists = artistsResp.docs as Array<{
    id: string | number
    slug?: string | null
    name: string
    displayMeta?: string | null
    nationality?: string | null
    portrait?: unknown
    featuredArtwork?: unknown
  }>

  return (
    <div>
      <section className="mh-hero">
        <p className="mh-hero__eyebrow">Mark Hachem Gallery — Admin</p>
        <h1 className="mh-hero__title">Bonjour, {greetingName}.</h1>
        <p className="mh-hero__subtitle">
          Curate the gallery’s online presence — manage exhibitions, artists, news and the
          standing collection across Paris, New York and Beirut.
        </p>
      </section>

      <div className="mh-stats">
        <div className="mh-stat">
          <div className="mh-stat__value">{exhibitionsCount.totalDocs}</div>
          <span className="mh-stat__label">Exhibitions</span>
        </div>
        <div className="mh-stat">
          <div className="mh-stat__value">{artistsCount.totalDocs}</div>
          <span className="mh-stat__label">Artists</span>
        </div>
        <div className="mh-stat">
          <div className="mh-stat__value">{mediaCount.totalDocs}</div>
          <span className="mh-stat__label">Media items</span>
        </div>
        <div className="mh-stat">
          <div className="mh-stat__value">{newsCount.totalDocs}</div>
          <span className="mh-stat__label">News</span>
        </div>
      </div>

      {exhibitions.length > 0 && (
        <section className="mh-section">
          <header className="mh-section__head">
            <h2 className="mh-section__title">Recent exhibitions</h2>
            <a className="mh-section__link" href="/admin/collections/exhibitions">
              View all →
            </a>
          </header>
          <div className="mh-grid">
            {exhibitions.map((ex) => {
              const cover = mediaUrl(ex.coverImage as never, 'card') ?? mediaUrl(ex.coverImage as never)
              return (
                <a
                  key={ex.id}
                  className="mh-card"
                  href={`/admin/collections/exhibitions/${ex.id}`}
                >
                  <div className="mh-card__media">
                    {cover ? (
                      <img src={cover} alt={mediaAlt(ex.coverImage as never, ex.title)} />
                    ) : (
                      <span className="mh-card__placeholder">·</span>
                    )}
                  </div>
                  <div className="mh-card__body">
                    <p className="mh-card__eyebrow">{cityLabel(ex.city)}</p>
                    <h3 className="mh-card__title">{ex.title}</h3>
                    <p className="mh-card__meta">
                      {formatExhibitionDate(ex.displayDates, ex.startDate, ex.endDate)}
                    </p>
                  </div>
                </a>
              )
            })}
          </div>
        </section>
      )}

      {artists.length > 0 && (
        <section className="mh-section">
          <header className="mh-section__head">
            <h2 className="mh-section__title">Featured artists</h2>
            <a className="mh-section__link" href="/admin/collections/artists">
              View all →
            </a>
          </header>
          <div className="mh-grid mh-grid--artists">
            {artists.map((artist) => {
              const portrait =
                mediaUrl(artist.featuredArtwork as never, 'card') ??
                mediaUrl(artist.portrait as never, 'card') ??
                mediaUrl(artist.portrait as never)
              return (
                <a
                  key={artist.id}
                  className="mh-card mh-card--artist"
                  href={`/admin/collections/artists/${artist.id}`}
                >
                  <div className="mh-card__media">
                    {portrait ? (
                      <img src={portrait} alt={artist.name} />
                    ) : (
                      <span className="mh-card__placeholder">{artist.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="mh-card__body">
                    <h3 className="mh-card__title">{artist.name}</h3>
                    <p className="mh-card__meta">
                      {artist.displayMeta ?? artist.nationality ?? ''}
                    </p>
                  </div>
                </a>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

export default BeforeDashboard
