import type { GlobalConfig } from 'payload'

export const Settings: GlobalConfig = {
  slug: 'settings',
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
          label: 'Gallery',
          fields: [
            { name: 'galleryName', type: 'text', defaultValue: 'Mark Hachem Gallery' },
            { name: 'tagline', type: 'textarea' },
            {
              type: 'row',
              fields: [
                { name: 'foundedYear', type: 'number', defaultValue: 1996, admin: { width: '50%' } },
                { name: 'foundedCity', type: 'text', defaultValue: 'Paris', admin: { width: '50%' } },
              ],
            },
            {
              name: 'whatsappNumber',
              type: 'text',
              admin: { description: 'In international format, e.g. "+33 6 09 18 27 11".' },
            },
            {
              name: 'whatsappPrefilledMessage',
              type: 'textarea',
              defaultValue: "Hello, I'd like to know more about Mark Hachem Gallery.",
              admin: { description: 'Pre-filled into the WhatsApp chat when a visitor taps the floating button.' },
            },
          ],
        },
        {
          label: 'Navigation',
          fields: [
            {
              name: 'navigation',
              type: 'group',
              fields: [
                {
                  name: 'links',
                  type: 'array',
                  labels: { singular: 'Link', plural: 'Links' },
                  admin: { description: 'Top nav menu items, in order.' },
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        { name: 'label', type: 'text', required: true, admin: { width: '40%' } },
                        { name: 'href', type: 'text', required: true, admin: { width: '50%', description: 'Internal path or full URL.' } },
                        { name: 'openInNewTab', type: 'checkbox', admin: { width: '10%' } },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Gallery Strip',
          fields: [
            {
              name: 'galleryStrip',
              type: 'array',
              labels: { singular: 'Photo', plural: 'Photos' },
              admin: { description: 'Photos in the homepage horizontal strip. Order matters; the strip duplicates the set for the seamless loop.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'image', type: 'upload', relationTo: 'media', required: true, admin: { width: '50%' } },
                    { name: 'alt', type: 'text', admin: { width: '50%', description: 'Falls back to the media alt if blank.' } },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Locations',
          fields: [
            {
              name: 'locations',
              type: 'array',
              labels: { singular: 'Location', plural: 'Locations' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'city', type: 'text', required: true, admin: { width: '50%' } },
                    {
                      name: 'isPrimary',
                      type: 'checkbox',
                      label: 'Primary location',
                      admin: { width: '50%' },
                    },
                  ],
                },
                {
                  name: 'addresses',
                  type: 'array',
                  labels: { singular: 'Address', plural: 'Addresses' },
                  admin: { description: 'A location can have multiple addresses (Paris has two).' },
                  fields: [{ name: 'lines', type: 'textarea', required: true, admin: { description: 'One line per row.' } }],
                },
                {
                  name: 'presenceText',
                  type: 'text',
                  admin: { description: 'Optional. Used when there is no concrete address (e.g. NYC: "By appointment only").' },
                },
                {
                  name: 'phones',
                  type: 'array',
                  labels: { singular: 'Phone', plural: 'Phones' },
                  fields: [{ name: 'value', type: 'text', required: true }],
                },
                { name: 'email', type: 'email' },
                { name: 'hours', type: 'textarea' },
                { name: 'mapUrl', type: 'text', admin: { description: 'Google Maps share link.' } },
              ],
            },
          ],
        },
        {
          label: 'Socials',
          fields: [
            {
              name: 'socials',
              type: 'group',
              fields: [
                { name: 'instagram', type: 'text' },
                { name: 'facebook', type: 'text' },
                { name: 'artsy', type: 'text' },
                { name: 'artnet', type: 'text' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
