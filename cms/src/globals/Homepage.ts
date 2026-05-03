import type { GlobalConfig } from 'payload'

export const Homepage: GlobalConfig = {
  slug: 'homepage',
  admin: {
    group: 'Configuration',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Hero',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'heroImage', type: 'upload', relationTo: 'media', admin: { width: '50%' } },
                { name: 'heroImageMobile', type: 'upload', relationTo: 'media', admin: { width: '50%' } },
              ],
            },
            {
              name: 'kicker',
              type: 'text',
              defaultValue: 'Est. Paris, 1996',
            },
            {
              type: 'row',
              fields: [
                { name: 'titleStrong', type: 'text', defaultValue: 'Mark', admin: { width: '50%', description: 'The bold first line of the title.' } },
                { name: 'titleRest', type: 'text', defaultValue: 'Hachem', admin: { width: '50%', description: 'The second line of the title.' } },
              ],
            },
            {
              name: 'taglinePillars',
              type: 'array',
              labels: { singular: 'Pillar', plural: 'Pillars' },
              minRows: 1,
              admin: { description: 'Dot-separated tagline phrases under the title.' },
              fields: [{ name: 'text', type: 'text', required: true }],
            },
          ],
        },
        {
          label: 'About',
          fields: [
            { name: 'portrait', type: 'upload', relationTo: 'media', admin: { description: 'Founder portrait.' } },
            { name: 'quote', type: 'textarea' },
            { name: 'attribution', type: 'text', defaultValue: '— Mark Hachem' },
            { name: 'heading', type: 'text' },
            { name: 'body', type: 'richText' },
            {
              name: 'milestones',
              type: 'array',
              labels: { singular: 'Milestone', plural: 'Milestones' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'value', type: 'text', required: true, admin: { width: '30%', description: 'e.g. "1996" or "300+".' } },
                    { name: 'label', type: 'text', required: true, admin: { width: '70%' } },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Featured Artists',
          fields: [
            {
              name: 'featuredArtists',
              type: 'relationship',
              relationTo: 'artists',
              hasMany: true,
              admin: { description: 'Order matters — drag to reorder. Drives the homepage roster.' },
            },
          ],
        },
        {
          label: 'Featured News',
          fields: [
            {
              name: 'featuredNews',
              type: 'relationship',
              relationTo: 'news',
              hasMany: true,
              admin: { description: 'Order matters. Cards on the homepage News block.' },
            },
          ],
        },
        {
          label: 'Featured Past Exhibitions',
          fields: [
            {
              name: 'featuredPastExhibitions',
              type: 'relationship',
              relationTo: 'exhibitions',
              hasMany: true,
              admin: { description: 'Order matters. Cards on the homepage Past Exhibitions block.' },
            },
          ],
        },
        {
          label: 'Featured Collection Works',
          fields: [
            {
              name: 'featuredCollectionWorks',
              type: 'array',
              labels: { singular: 'Work', plural: 'Works' },
              admin: { description: 'Each card links to the artist page.' },
              fields: [
                { name: 'artist', type: 'relationship', relationTo: 'artists', required: true },
                { name: 'image', type: 'upload', relationTo: 'media' },
                { name: 'title', type: 'text', admin: { description: 'Work title or location/dates.' } },
                { name: 'medium', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Contact CTA',
          fields: [
            {
              name: 'contactCta',
              type: 'group',
              fields: [
                { name: 'heading', type: 'text', defaultValue: 'Interested in a work or exhibition?' },
                {
                  name: 'subheading',
                  type: 'text',
                  defaultValue: 'We welcome inquiries from collectors, institutions, and press.',
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'buttonLabel', type: 'text', defaultValue: 'Send Inquiry', admin: { width: '50%' } },
                    { name: 'buttonHref', type: 'text', defaultValue: 'mailto:paris@markhachem.com', admin: { width: '50%' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
