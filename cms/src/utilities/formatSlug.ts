import type { FieldHook } from 'payload'

export const formatSlug = (val: string): string =>
  val
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()

export const slugifyFromField =
  (sourceField: string): FieldHook =>
  ({ data, value }) => {
    if (typeof value === 'string' && value.length) return formatSlug(value)
    const source = data?.[sourceField]
    if (typeof source === 'string' && source.length) return formatSlug(source)
    return value
  }
