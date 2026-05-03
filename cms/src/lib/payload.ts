import { getPayload, type Payload } from 'payload'
import configPromise from '../payload.config'

let cached: Promise<Payload> | null = null

export function getPayloadClient(): Promise<Payload> {
  if (!cached) {
    cached = (async () => getPayload({ config: await configPromise }))()
  }
  return cached
}
