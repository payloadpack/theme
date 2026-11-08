import { buildEditorState } from '@payloadcms/richtext-lexical'
import { randomUUID } from 'node:crypto'
import type { CollectionSlug, GlobalSlug, Payload } from 'payload'

import type { Post } from './payload-types'

export const DEMO_USER = { email: 'demo@payloadpack.com', password: 'demo' }

const isoDateInOctober = (offset: number) => new Date(Date.UTC(2026, 9, 1 + offset, 9)).toISOString()

const buildTimestampsInOctober = (offset: number) => ({
  createdAt: isoDateInOctober(offset),
  updatedAt: isoDateInOctober(offset)
})

const pinVersionTimestampsToDocumentDates = async (payload: Payload, collection: Exclude<CollectionSlug, 'payload-kv'>) => {
  const { docs: versions } = await payload.findVersions({ collection, depth: 0, overrideAccess: true, pagination: false })
  for (const { id, version } of versions) {
    await payload.db.updateVersion({
      collection,
      id,
      returning: false,
      versionData: { createdAt: version.createdAt, updatedAt: version.createdAt, version: {} }
    })
  }
}

const pinGlobalTimestamps = async (payload: Payload, slug: GlobalSlug, savedAt: string) => {
  await payload.db.updateGlobal({ slug, data: { createdAt: savedAt, updatedAt: savedAt }, returning: false })
  const { docs: versions } = await payload.findGlobalVersions({ slug, depth: 0, overrideAccess: true, pagination: false })
  for (const { id } of versions) {
    await payload.db.updateGlobalVersion({
      global: slug,
      id,
      returning: false,
      versionData: { createdAt: savedAt, updatedAt: savedAt, version: {} }
    })
  }
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const richTextFromText = (text: string) => buildEditorState<Post['content']>({ text })

const labelledSvgUpload = (label: string, hue: number) => {
  const data = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="hsl(${hue} 55% 55%)"/><text x="50%" y="50%" fill="white" font-family="sans-serif" font-size="96" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`
  )
  return { data, mimetype: 'image/svg+xml', name: `${label.toLowerCase()}.svg`, size: data.length }
}

const POSTS = [
  'Getting started with the admin',
  'Designing a calm dashboard',
  'What changed in the beta',
  'Writing release notes people read',
  'Dark mode without surprises',
  'A field guide to relationships',
  'Shipping drafts and versions',
  'How we test the theme',
  'Keyboard first editing',
  'Choosing a palette',
  'Uploads that stay fast',
  'Notes from the community call'
]

const PRODUCTS = [
  'Desk lamp',
  'Notebook',
  'Backpack',
  'Water bottle',
  'Headphones',
  'Mug',
  'Keyboard',
  'Plant pot',
  'Tote bag',
  'Blanket'
]
const COLORS = ['Sand', 'Slate', 'Moss']

const CUSTOMERS = [
  ['Ada Lindqvist', 'Northwind'],
  ['Bo Andersson', 'Fjord Labs'],
  ['Cleo Martin', 'Brightside'],
  ['Dev Patel', 'Studio Nine'],
  ['Elin Berg', 'Northwind'],
  ['Farah Haddad', 'Atlas & Co'],
  ['Gus Holm', ''],
  ['Hana Sato', 'Kumo'],
  ['Ivo Novak', 'Brightside'],
  ['Jonna Ek', ''],
  ['Kai Weber', 'Fjord Labs'],
  ['Lea Moreau', 'Atlas & Co']
]

const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] as const

export async function seed(payload: Payload) {
  const isCollectionEmpty = async (collection: CollectionSlug) =>
    (await payload.count({ collection, overrideAccess: true, trash: true })).totalDocs === 0
  const findDocsInCreationOrder = async <T extends CollectionSlug>(collection: T) =>
    (await payload.find({ collection, depth: 0, limit: 100, overrideAccess: true, sort: 'createdAt' })).docs

  if (await isCollectionEmpty('users')) {
    const user = await payload.create({
      collection: 'users',
      data: { ...DEMO_USER, apiKey: randomUUID(), ...buildTimestampsInOctober(0) },
      overrideAccess: true
    })

    await payload.create({
      collection: 'showcase',
      data: {
        authors: [user.id],
        code: "export const theme = 'neutral'",
        ...buildTimestampsInOctober(0),
        links: [{ label: 'First link' }],
        smallCode: '// keeps its own 10px font size',
        slug: 'showcase',
        title: 'Showcase',
        type: 'one'
      },
      overrideAccess: true
    })
    await pinVersionTimestampsToDocumentDates(payload, 'users')
    await pinVersionTimestampsToDocumentDates(payload, 'showcase')
  }
  const [author] = await findDocsInCreationOrder('users')

  if (await isCollectionEmpty('media')) {
    for (const [index, label] of ['Harbor', 'Forest', 'Studio', 'Market', 'Coast', 'Summit'].entries()) {
      await payload.create({
        collection: 'media',
        data: {
          alt: `${label} illustration`,
          caption: index % 2 ? `A ${label.toLowerCase()} scene.` : undefined,
          ...buildTimestampsInOctober(index)
        },
        file: labelledSvgUpload(label, index * 55),
        overrideAccess: true
      })
    }
    await pinVersionTimestampsToDocumentDates(payload, 'media')
  }
  const media = await findDocsInCreationOrder('media')

  if (await isCollectionEmpty('categories')) {
    const news = await payload.create({
      collection: 'categories',
      data: {
        ...buildTimestampsInOctober(0),
        description: 'Announcements and updates.',
        name: 'News',
        slug: 'news'
      },
      overrideAccess: true
    })
    for (const [index, name] of ['Guides', 'Releases', 'Design', 'Engineering', 'Community'].entries()) {
      await payload.create({
        collection: 'categories',
        data: {
          ...buildTimestampsInOctober(index + 1),
          name,
          parent: name === 'Releases' ? news.id : undefined,
          slug: slugify(name)
        },
        overrideAccess: true
      })
    }
    await pinVersionTimestampsToDocumentDates(payload, 'categories')
  }
  const categories = await findDocsInCreationOrder('categories')

  if (await isCollectionEmpty('tags')) {
    for (const [index, name] of ['Announcement', 'Tutorial', 'Release'].entries()) {
      await payload.create({
        collection: 'tags',
        data: { ...buildTimestampsInOctober(index), name },
        overrideAccess: true
      })
    }
    await pinVersionTimestampsToDocumentDates(payload, 'tags')
  }
  const tags = await findDocsInCreationOrder('tags')

  if (await isCollectionEmpty('posts')) {
    for (let index = 0; index < 24; index++) {
      const title = POSTS[index] ?? `Weekly notes #${index - POSTS.length + 1}`
      await payload.create({
        collection: 'posts',
        data: {
          _h_tags: index % 3 === 0 ? [tags[(index / 3) % tags.length]!.id] : undefined,
          _status: index % 5 === 4 ? 'draft' : 'published',
          author: author?.id,
          categories: [categories[index % categories.length]!.id, categories[(index + 2) % categories.length]!.id],
          content: richTextFromText(`${title}. This post is demo content for the theme.`),
          ...buildTimestampsInOctober(index),
          excerpt: `A short look at ${title.toLowerCase()}.`,
          heroImage: media[index % media.length]?.id,
          publishedAt: isoDateInOctober(index),
          readingTime: 3 + (index % 7),
          slug: slugify(title),
          title
        },
        overrideAccess: true
      })
    }
    await pinVersionTimestampsToDocumentDates(payload, 'posts')
  }

  if (await isCollectionEmpty('pages')) {
    for (const [index, title] of ['Home', 'About', 'Pricing', 'Contact', 'Careers', 'Privacy'].entries()) {
      await payload.create({
        collection: 'pages',
        data: {
          _status: title === 'Careers' ? 'draft' : 'published',
          ...buildTimestampsInOctober(index),
          layout: [
            { blockType: 'hero', heading: title, image: media[index % media.length]?.id, subheading: `Welcome to ${title}.` },
            { blockType: 'content', body: richTextFromText(`${title} page body.`) },
            {
              blockType: 'faq',
              items: [
                { answer: 'Yes, every palette has a light and a dark version.', question: 'Does it support dark mode?' },
                { answer: 'No, the defaults work out of the box.', question: 'Do I need to configure it?' }
              ]
            }
          ],
          meta: { description: `The ${title.toLowerCase()} page.`, title },
          publishedAt: isoDateInOctober(index),
          slug: slugify(title),
          title
        },
        overrideAccess: true
      })
    }
    await pinVersionTimestampsToDocumentDates(payload, 'pages')
  }

  if (await isCollectionEmpty('products')) {
    for (let index = 0; index < PRODUCTS.length * COLORS.length; index++) {
      const name = PRODUCTS[index % PRODUCTS.length]!
      const color = COLORS[Math.floor(index / PRODUCTS.length)]!
      await payload.create({
        collection: 'products',
        data: {
          categories: [categories[index % categories.length]!.id],
          condition: index % 7 === 0 ? 'refurbished' : 'new',
          ...buildTimestampsInOctober(index),
          gallery: [media[index % media.length]!.id],
          inStock: index % 6 !== 5,
          price: 9 + ((index * 7) % 90) + 0.95,
          sku: `PP-${1000 + index}`,
          specs: { color, weight: `${100 + index * 10}g` },
          stock: (index * 13) % 40,
          supplier: { email: 'orders@supplier.example', name: 'Supplier AB' },
          title: `${name}, ${color}`,
          variants: [
            { color, price: 19, size: 's' },
            { color, price: 21, size: 'm' }
          ]
        },
        overrideAccess: true
      })
    }
    await pinVersionTimestampsToDocumentDates(payload, 'products')
  }
  const products = await findDocsInCreationOrder('products')

  if (await isCollectionEmpty('customers')) {
    for (const [index, [name, company]] of CUSTOMERS.entries()) {
      await payload.create({
        collection: 'customers',
        data: {
          _status: 'published',
          company: company || undefined,
          ...buildTimestampsInOctober(index),
          email: `${name!.split(' ')[0]!.toLowerCase()}@example.com`,
          name: name!,
          tier: (['standard', 'silver', 'gold'] as const)[index % 3]
        },
        overrideAccess: true
      })
    }
    await pinVersionTimestampsToDocumentDates(payload, 'customers')
  }
  const customers = await findDocsInCreationOrder('customers')

  if (await isCollectionEmpty('orders')) {
    for (let index = 0; index < 18; index++) {
      const items = [0, 1, 2]
        .slice(0, 1 + (index % 3))
        .map((offset) => products[(index * 3 + offset) % products.length]!)
        .map((product) => ({ price: product.price as number, product: product.id, quantity: 1 + (index % 2) }))
      await payload.create({
        collection: 'orders',
        data: {
          ...buildTimestampsInOctober(index),
          customer: customers[index % customers.length]!.id,
          items,
          orderNumber: `#${2041 + index}`,
          placedAt: isoDateInOctober(index),
          shipping: { city: 'Stockholm', country: 'SE', line1: `Storgatan ${index + 1}`, postalCode: '111 22' },
          status: STATUSES[index % STATUSES.length],
          total: Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100
        },
        overrideAccess: true
      })
    }
    await pinVersionTimestampsToDocumentDates(payload, 'orders')
  }

  const settings = await payload.findGlobal({ slug: 'site-settings', overrideAccess: true })
  if (!settings.siteName) {
    await payload.updateGlobal({
      slug: 'site-settings',
      data: {
        defaultTitle: 'Payloadpack demo',
        logo: media[0]?.id,
        siteName: 'Payloadpack',
        social: [{ platform: 'github', url: 'https://github.com/payloadpack/theme' }],
        tagline: 'A theme for the Payload admin'
      },
      overrideAccess: true
    })
    await pinGlobalTimestamps(payload, 'site-settings', isoDateInOctober(0))
  }
}
