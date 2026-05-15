import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Artists } from './collections/Artists'
import { Exhibitions } from './collections/Exhibitions'
import { News } from './collections/News'
import { Events } from './collections/Events'
import { Fairs } from './collections/Fairs'
import { Settings } from './globals/Settings'
import { Homepage } from './globals/Homepage'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      title: 'Mark Hachem Gallery — Admin',
      description:
        'Mark Hachem Gallery — content management for exhibitions, artists, news and the standing collection.',
      titleSuffix: ' · Mark Hachem',
      icons: [{ rel: 'icon', type: 'image/png', url: '/assets/images/fav-ico.png' }],
    },
    components: {
      graphics: {
        Logo: { path: '/admin/components/Logo#Logo' },
        Icon: { path: '/admin/components/Icon#Icon' },
      },
      beforeLogin: ['/admin/components/BeforeLogin#BeforeLogin'],
      beforeDashboard: ['/admin/components/BeforeDashboard#BeforeDashboard'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Artists, Exhibitions, News, Events, Fairs],
  globals: [Settings, Homepage],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI || 'file:./payload.db',
    },
  }),
  sharp,
  plugins: [],
})
