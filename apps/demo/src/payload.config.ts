import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { BlocksFeature, CodeBlock, FixedToolbarFeature, lexicalEditor, TableFeature } from '@payloadcms/richtext-lexical'
import { RADIO_CARDS, SWITCH, SWITCH_END, themePlugin, VERTICAL_TABS } from '@payloadpack/theme'
import path from 'path'
import { createElement, Fragment } from 'react'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { collections, globals } from './collections'
import { DEMO_USER, seed } from './seed'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const radioCardLabel = (title: string, description: string) =>
  createElement(Fragment, null, createElement('strong', null, title), createElement('span', null, description))

const AMENITIES = [
  'wifi',
  'parking',
  'pool',
  'gym',
  'spa',
  'breakfast',
  'pets',
  'accessible',
  'evCharging',
  'airConditioning',
  'balcony',
  'kitchen',
  'laundry',
  'workspace',
  'elevator',
  'garden',
  'sauna',
  'bikeRental',
  'airportShuttle',
  'roomService',
  'bar',
  'restaurant',
  'beachAccess',
  'skiStorage'
]

export default buildConfig({
  admin: {
    autoLogin: process.env.NODE_ENV === 'development' ? { ...DEMO_USER, prefillOnly: true } : false,
    components: {
      afterNavLinks: ['/views/PreviewNavLinks#PreviewNavLinks'],
      views: {
        navIcons: { Component: '/views/NavIcons#NavIconsView', meta: { title: 'Nav icons' }, path: '/nav-icons' },
        toasts: { Component: '/views/Toasts#ToastsView', meta: { title: 'Toasts' }, path: '/toasts' }
      }
    },
    importMap: { baseDir: path.resolve(dirname) },
    user: 'users'
  },
  collections: [
    {
      slug: 'users',
      admin: { useAsTitle: 'email' },
      auth: { useAPIKey: true },
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
      lockDocuments: false,
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'reference', type: 'text', defaultValue: 'SC-001', admin: { readOnly: true } },
        { name: 'type', type: 'select', options: ['one', 'two'] },
        { name: 'featured', type: 'checkbox', admin: { description: 'Show this first on the front page' } },
        {
          name: 'size',
          type: 'radio',
          options: ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', 'custom'],
          admin: { layout: 'horizontal' }
        },
        {
          name: 'plan',
          type: 'radio',
          admin: { className: RADIO_CARDS },
          options: [
            { label: radioCardLabel('Plus', 'For individuals and small teams.'), value: 'plus' },
            { label: radioCardLabel('Pro', 'For growing businesses.'), value: 'pro' },
            { label: radioCardLabel('Enterprise', 'For large teams and enterprises.'), value: 'enterprise' }
          ]
        },
        { name: 'amenityTags', type: 'select', hasMany: true, options: AMENITIES },
        {
          name: 'amenities',
          type: 'group',
          fields: [
            {
              type: 'row',
              fields: AMENITIES.map((name) => ({ name, type: 'checkbox' as const, admin: { width: '25%' } }))
            }
          ]
        },
        {
          name: 'notify',
          type: 'checkbox',
          label: 'Notify subscribers',
          admin: { className: SWITCH, description: 'Email everyone who follows this showcase' }
        },
        {
          name: 'pinned',
          type: 'checkbox',
          label: 'Pin to the top',
          admin: { className: SWITCH_END, description: 'Keep this showcase first in every list' }
        },
        {
          name: 'body',
          type: 'richText',
          editor: lexicalEditor({
            features: ({ defaultFeatures }) => [
              ...defaultFeatures,
              FixedToolbarFeature(),
              BlocksFeature({ blocks: [CodeBlock()] }),
              TableFeature()
            ]
          })
        },
        { name: 'links', type: 'array', fields: [{ name: 'label', type: 'text' }] },
        { name: 'authors', type: 'relationship', hasMany: true, relationTo: 'users' },
        { name: 'code', type: 'code' },
        { name: 'smallCode', type: 'code', admin: { editorOptions: { fontSize: 10 } } },
        { name: 'publishedAt', type: 'date', admin: { position: 'sidebar' } },
        { name: 'slug', type: 'slug', useAsSlug: 'title' },
        {
          type: 'tabs',
          admin: { className: VERTICAL_TABS },
          tabs: [
            { label: 'General', fields: [{ name: 'metaTitle', type: 'text' }] },
            { label: 'Advanced', fields: [{ name: 'canonicalUrl', type: 'text' }] }
          ]
        },
        { name: 'eventStart', type: 'date', timezone: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
        {
          name: 'customFieldComponents',
          type: 'ui',
          admin: { components: { Field: '/fields/CustomFieldComponents#CustomFieldComponents' } }
        }
      ],
      versions: { drafts: true }
    },
    ...collections
  ],
  cookiePrefix: 'theme-demo',
  db: sqliteAdapter({ client: { url: process.env.DATABASE_URI || '' } }),
  editor: lexicalEditor(),
  globals,
  localization: { defaultLocale: 'en', locales: ['en', 'sv'] },
  onInit: seed,
  plugins: [
    themePlugin({
      palettes: [
        { slug: 'payload' },
        { slug: 'neutral' },
        { slug: 'warm' },
        { slug: 'soft' },
        { label: 'Indigo', slug: 'indigo' }
      ]
    })
  ],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') }
})
