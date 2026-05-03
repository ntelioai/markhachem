import type { CollectionConfig } from 'payload'
import { slugifyFromField } from '../utilities/formatSlug'

export const Exhibitions: CollectionConfig = {
  slug: 'exhibitions',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'city', 'startDate', 'isNowShowing'],
    group: 'Content',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'URL slug. Auto-generated from title if left blank.',
      },
      hooks: {
        beforeValidate: [slugifyFromField('title')],
      },
    },
    {
      name: 'city',
      type: 'select',
      required: true,
      options: [
        { label: 'Paris', value: 'paris' },
        { label: 'New York', value: 'new-york' },
        { label: 'Beirut', value: 'beirut' },
        { label: 'Other', value: 'other' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'isNowShowing',
      type: 'checkbox',
      label: 'Now showing',
      admin: {
        position: 'sidebar',
        description: 'Pin to the homepage "Now Showing" block.',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        { name: 'startDate', type: 'date', admin: { width: '50%' } },
        { name: 'endDate', type: 'date', admin: { width: '50%' } },
      ],
    },
    {
      name: 'displayDates',
      type: 'text',
      admin: {
        description:
          'Free-form date string as it should appear on the site (e.g. "08 - 25 January, 2025" or "du 10 avril au 1er Mai 2025"). Overrides formatted start/end.',
      },
    },
    {
      name: 'location',
      type: 'text',
      admin: { description: 'Address or venue line, e.g. "28 Place des Vosges, 75003".' },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'coverIsArtwork',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Render the cover with `is-artwork` styling (contained, padded, light background) when the source is an artwork rather than a photo.',
      },
    },
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'artists',
      type: 'relationship',
      relationTo: 'artists',
      hasMany: true,
    },
    {
      type: 'collapsible',
      label: 'PDF / press',
      fields: [
        {
          name: 'pdf',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Upload a PDF (preferred for new exhibitions).' },
        },
        {
          name: 'pdfExternalUrl',
          type: 'text',
          admin: { description: 'External PDF URL (used for legacy archive.org links).' },
        },
      ],
    },
  ],
}
