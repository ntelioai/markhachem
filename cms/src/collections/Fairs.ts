import type { CollectionConfig } from 'payload'
import { slugifyFromField } from '../utilities/formatSlug'

export const Fairs: CollectionConfig = {
  slug: 'fairs',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'city', 'status', 'showInLatest', 'showInFairsGrid'],
    group: 'Content',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
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
        description: 'URL slug. Auto-generated from name if left blank.',
      },
      hooks: {
        beforeValidate: [slugifyFromField('name')],
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'past',
      options: [
        { label: 'Upcoming', value: 'upcoming' },
        { label: 'Current', value: 'current' },
        { label: 'Past', value: 'past' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'showInLatest',
      type: 'checkbox',
      admin: {
        position: 'sidebar',
        description: 'Surface on the homepage "Current & Upcoming" rich-card section.',
      },
    },
    {
      name: 'showInFairsGrid',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Show in the homepage "Art Fairs" logo grid.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first in the grid.',
      },
    },
    {
      type: 'row',
      fields: [
        { name: 'logo', type: 'upload', relationTo: 'media', admin: { width: '50%', description: 'Square logo for the §11 grid.' } },
        { name: 'coverImage', type: 'upload', relationTo: 'media', admin: { width: '50%', description: 'Photo for the §10 rich card (Current & Upcoming).' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'city', type: 'text', admin: { width: '50%', description: 'e.g. "Basel"' } },
        { name: 'location', type: 'text', admin: { width: '50%', description: 'Section §11 line, e.g. "Basel & New York".' } },
      ],
    },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'Short description shown in the §11 grid card.' },
    },
    {
      name: 'participationLine',
      type: 'text',
      admin: { description: 'Footer line for the §11 card, e.g. "Booth C01" / "Recurring Participant" / "2024 Participant".' },
    },
    {
      type: 'collapsible',
      label: 'Current & Upcoming details (§10)',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'booth', type: 'text', admin: { width: '50%' } },
            { name: 'dateRange', type: 'text', admin: { width: '50%', description: 'Display string, e.g. "14–17 May 2026".' } },
          ],
        },
        { name: 'venue', type: 'text' },
        { name: 'startDate', type: 'date', admin: { description: 'Used to sort the §10 cards.' } },
        {
          name: 'dateRows',
          type: 'array',
          labels: { singular: 'Date row', plural: 'Date rows' },
          admin: { description: 'Sub-rows on the §10 card, e.g. VIP Preview / Public Days.' },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'label', type: 'text', required: true, admin: { width: '40%' } },
                { name: 'value', type: 'text', required: true, admin: { width: '60%' } },
              ],
            },
          ],
        },
      ],
    },
  ],
}
