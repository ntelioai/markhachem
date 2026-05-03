import type { CollectionConfig } from 'payload'
import { slugifyFromField } from '../utilities/formatSlug'

export const Artists: CollectionConfig = {
  slug: 'artists',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'nationality', 'featured'],
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
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'contemporary',
      options: [
        { label: 'Modern', value: 'modern' },
        { label: 'Contemporary', value: 'contemporary' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'featured',
      type: 'checkbox',
      admin: {
        position: 'sidebar',
        description: 'Surface on the homepage roster.',
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
      type: 'collapsible',
      label: 'Biographical details',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'nationality', type: 'text', admin: { width: '50%' } },
            {
              name: 'displayMeta',
              type: 'text',
              label: 'Display line',
              admin: {
                width: '50%',
                description: 'e.g. "Lebanese, 1924–2006". Overrides auto-formatted nationality/years.',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'birthYear', type: 'number', admin: { width: '50%' } },
            { name: 'deathYear', type: 'number', admin: { width: '50%' } },
          ],
        },
      ],
    },
    {
      name: 'portrait',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Hero image shown on the artist page (portrait or signature artwork).',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'portraitTitle',
          type: 'text',
          label: 'Portrait caption — title',
          admin: { width: '50%', description: 'e.g. "Taureau, 2015"' },
        },
        {
          name: 'portraitMedium',
          type: 'text',
          label: 'Portrait caption — medium',
          admin: { width: '50%', description: 'e.g. "Bronze, edition of 8 — 50 × 70 cm"' },
        },
      ],
    },
    {
      name: 'bio',
      type: 'richText',
    },
    {
      type: 'collapsible',
      label: 'Homepage card (artwork shown on /)',
      admin: { description: 'Used on the homepage Featured Artists grid. Falls back to the portrait above if blank.' },
      fields: [
        {
          name: 'featuredArtwork',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Square-ish artwork image used on the home card (often a "-sml" variant of the artist-page portrait).' },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'featuredArtworkTitle',
              type: 'text',
              admin: { width: '50%', description: 'Caption title, e.g. "Couleur additive, Série 14".' },
            },
            {
              name: 'featuredArtworkMedium',
              type: 'text',
              admin: { width: '50%', description: 'Caption medium, e.g. "Ceramic — 80 × 80 cm".' },
            },
          ],
        },
      ],
    },
  ],
}
