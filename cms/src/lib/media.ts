import type { Media } from '../payload-types'

type MediaRef = number | string | Media | null | undefined

export function mediaUrl(ref: MediaRef, size?: 'thumbnail' | 'card' | 'hero'): string | null {
  if (!ref || typeof ref === 'number' || typeof ref === 'string') return null
  const media = ref as Media
  if (size && media.sizes && media.sizes[size]?.url) return media.sizes[size]!.url!
  return media.url ?? null
}

export function mediaAlt(ref: MediaRef, fallback = ''): string {
  if (!ref || typeof ref === 'number' || typeof ref === 'string') return fallback
  return (ref as Media).alt ?? fallback
}

export function mediaWidth(ref: MediaRef): number | undefined {
  if (!ref || typeof ref === 'number' || typeof ref === 'string') return undefined
  return (ref as Media).width ?? undefined
}

export function mediaHeight(ref: MediaRef): number | undefined {
  if (!ref || typeof ref === 'number' || typeof ref === 'string') return undefined
  return (ref as Media).height ?? undefined
}
