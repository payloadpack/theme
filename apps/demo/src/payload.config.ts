import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { FixedToolbarFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { themePlugin } from '@payloadpack/theme'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { seed } from './seed'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  admin: {
    importMap: { baseDir: path.resolve(dirname) },
    user: 'users'
  },
  collections: [
    {
      slug: 'users',
      admin: { useAsTitle: 'email' },
      auth: true,
      fields: []
    },
    {
      slug: 'folders',
      admin: { useAsTitle: 'name' },
      fields: [{ name: 'name', type: 'text', required: true }],
      folders: true
    },
    {
      slug: 'showcase',
      admin: { useAsTitle: 'title' },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'type', type: 'select', options: ['one', 'two'] },
        {
          name: 'body',
          type: 'richText',
          editor: lexicalEditor({ features: ({ defaultFeatures }) => [...defaultFeatures, FixedToolbarFeature()] })
        },
        { name: 'links', type: 'array', fields: [{ name: 'label', type: 'text' }] },
        { name: 'authors', type: 'relationship', hasMany: true, relationTo: 'users' },
        { name: 'code', type: 'code' },
        { name: 'smallCode', type: 'code', admin: { editorOptions: { fontSize: 10 } } },
        { name: 'publishedAt', type: 'date', admin: { position: 'sidebar' } },
        { name: 'slug', type: 'slug', useAsSlug: 'title' }
      ],
      versions: { drafts: true }
    }
  ],
  cookiePrefix: 'theme-demo',
  db: sqliteAdapter({ client: { url: process.env.DATABASE_URI || '' } }),
  editor: lexicalEditor(),
  onInit: seed,
  plugins: [themePlugin()],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') }
})
