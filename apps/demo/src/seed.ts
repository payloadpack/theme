import { buildEditorState } from '@payloadcms/richtext-lexical'
import { randomUUID } from 'node:crypto'
import type { CollectionSlug, Payload } from 'payload'

import type { Post } from './payload-types'

export const demoUser = { email: 'demo@payloadpack.com', password: 'demo' }

const day = (offset: number) => new Date(Date.UTC(2026, 9, 1 + offset, 9)).toISOString()

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const richText = (text: string) => buildEditorState<Post['content']>({ text })

const image = (label: string, hue: number) => {
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
  const empty = async (collection: CollectionSlug) => (await payload.count({ collection, overrideAccess: true })).totalDocs === 0
  const all = async <T extends CollectionSlug>(collection: T) =>
    (await payload.find({ collection, depth: 0, limit: 100, overrideAccess: true, sort: 'createdAt' })).docs

  if (await empty('users')) {
    const user = await payload.create({ collection: 'users', data: { ...demoUser, apiKey: randomUUID() }, overrideAccess: true })

    await payload.create({
      collection: 'showcase',
      data: {
        authors: [user.id],
        code: "export const theme = 'neutral'",
        links: [{ label: 'First link' }],
        smallCode: '// keeps its own 10px font size',
        slug: 'showcase',
        title: 'Showcase',
        type: 'one'
      },
      overrideAccess: true
    })
  }
  const [author] = await all('users')

  if (await empty('media')) {
    for (const [index, label] of ['Harbor', 'Forest', 'Studio', 'Market', 'Coast', 'Summit'].entries()) {
      await payload.create({
        collection: 'media',
        data: { alt: `${label} illustration`, caption: index % 2 ? `A ${label.toLowerCase()} scene.` : undefined },
        file: image(label, index * 55),
        overrideAccess: true
      })
    }
  }
  const media = await all('media')

  if (await empty('categories')) {
    const news = await payload.create({
      collection: 'categories',
      data: { description: 'Announcements and updates.', name: 'News', slug: 'news' },
      overrideAccess: true
    })
    for (const name of ['Guides', 'Releases', 'Design', 'Engineering', 'Community']) {
      await payload.create({
        collection: 'categories',
        data: { name, parent: name === 'Releases' ? news.id : undefined, slug: slugify(name) },
        overrideAccess: true
      })
    }
  }
  const categories = await all('categories')

  if (await empty('posts')) {
    for (let index = 0; index < 24; index++) {
      const title = POSTS[index] ?? `Weekly notes #${index - POSTS.length + 1}`
      await payload.create({
        collection: 'posts',
        data: {
          _status: index % 5 === 4 ? 'draft' : 'published',
          author: author?.id,
          categories: [categories[index % categories.length]!.id, categories[(index + 2) % categories.length]!.id],
          content: richText(`${title}. This post is demo content for the theme.`),
          excerpt: `A short look at ${title.toLowerCase()}.`,
          heroImage: media[index % media.length]?.id,
          publishedAt: day(index),
          readingTime: 3 + (index % 7),
          slug: slugify(title),
          title
        },
        overrideAccess: true
      })
    }
  }

  if (await empty('pages')) {
    for (const [index, title] of ['Home', 'About', 'Pricing', 'Contact', 'Careers', 'Privacy'].entries()) {
      await payload.create({
        collection: 'pages',
        data: {
          _status: title === 'Careers' ? 'draft' : 'published',
          layout: [
            { blockType: 'hero', heading: title, image: media[index % media.length]?.id, subheading: `Welcome to ${title}.` },
            { blockType: 'content', body: richText(`${title} page body.`) },
            {
              blockType: 'faq',
              items: [
                { answer: 'Yes, every palette has a light and a dark version.', question: 'Does it support dark mode?' },
                { answer: 'No, the defaults work out of the box.', question: 'Do I need to configure it?' }
              ]
            }
          ],
          meta: { description: `The ${title.toLowerCase()} page.`, title },
          publishedAt: day(index),
          slug: slugify(title),
          title
        },
        overrideAccess: true
      })
    }
  }

  if (await empty('products')) {
    for (let index = 0; index < PRODUCTS.length * COLORS.length; index++) {
      const name = PRODUCTS[index % PRODUCTS.length]!
      const color = COLORS[Math.floor(index / PRODUCTS.length)]!
      await payload.create({
        collection: 'products',
        data: {
          categories: [categories[index % categories.length]!.id],
          condition: index % 7 === 0 ? 'refurbished' : 'new',
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
  }
  const products = await all('products')

  if (await empty('customers')) {
    for (const [index, [name, company]] of CUSTOMERS.entries()) {
      await payload.create({
        collection: 'customers',
        data: {
          company: company || undefined,
          email: `${name!.split(' ')[0]!.toLowerCase()}@example.com`,
          name: name!,
          tier: (['standard', 'silver', 'gold'] as const)[index % 3]
        },
        overrideAccess: true
      })
    }
  }
  const customers = await all('customers')

  if (await empty('orders')) {
    for (let index = 0; index < 18; index++) {
      const items = [0, 1, 2]
        .slice(0, 1 + (index % 3))
        .map((offset) => products[(index * 3 + offset) % products.length]!)
        .map((product) => ({ price: product.price as number, product: product.id, quantity: 1 + (index % 2) }))
      await payload.create({
        collection: 'orders',
        data: {
          customer: customers[index % customers.length]!.id,
          items,
          orderNumber: `#${2041 + index}`,
          placedAt: day(index),
          shipping: { city: 'Stockholm', country: 'SE', line1: `Storgatan ${index + 1}`, postalCode: '111 22' },
          status: STATUSES[index % STATUSES.length],
          total: Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100
        },
        overrideAccess: true
      })
    }
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
  }
}
