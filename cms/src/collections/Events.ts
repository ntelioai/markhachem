import type { CollectionConfig } from 'payload'
import { slugifyFromField } from '../utilities/formatSlug'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'dateRange', 'badgeLabel', 'featured'],
    group: 'Content',
    description:
      'Important events in galleries, museums, and artist studios — talks, openings, studio visits, fairs, screenings.',
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
      name: 'featured',
      type: 'checkbox',
      admin: {
        position: 'sidebar',
        description: 'Surface in the homepage Events block.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first.',
      },
    },
    {
      name: 'publishedDate',
      type: 'date',
      admin: { position: 'sidebar' },
    },
    {
      name: 'subtitle',
      type: 'text',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'dateRange',
          type: 'text',
          admin: {
            width: '50%',
            description: 'Display string, e.g. "7 March — 12 July 2026".',
          },
        },
        {
          name: 'location',
          type: 'text',
          admin: { width: '50%', description: 'City, e.g. "Paris".' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'badgeLabel',
          type: 'text',
          admin: { width: '50%', description: 'e.g. "Gallery", "Museum", "Studio Visit".' },
        },
        {
          name: 'badgeStyle',
          type: 'select',
          defaultValue: 'default',
          options: [
            { label: 'Default', value: 'default' },
            { label: 'Gold', value: 'gold' },
          ],
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'venue',
      type: 'richText',
      admin: { description: 'Venue line including host or curator (rendered above the excerpt).' },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      admin: { description: 'Short summary shown on the homepage card.' },
    },
    {
      name: 'body',
      type: 'richText',
      admin: { description: 'Full event description for the detail page.' },
    },
  ],
}
