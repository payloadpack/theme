import type { CollectionConfig, Field, GlobalConfig } from 'payload'

const link: Field = {
  name: 'link',
  type: 'group',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'radio',
          defaultValue: 'internal',
          options: ['internal', 'external'],
          admin: { layout: 'horizontal', width: '50%' }
        },
        { name: 'newTab', type: 'checkbox', label: 'Open in a new tab', admin: { width: '50%' } }
      ]
    },
    {
      name: 'reference',
      type: 'relationship',
      relationTo: ['pages', 'posts'],
      admin: { condition: (_, sibling) => sibling?.type === 'internal' }
    },
    { name: 'url', type: 'text', admin: { condition: (_, sibling) => sibling?.type === 'external' } }
  ]
}

export const collections: CollectionConfig[] = [
  {
    slug: 'pages',
    admin: { defaultColumns: ['title', 'slug', '_status', 'updatedAt'], group: 'Content', useAsTitle: 'title' },
    fields: [
      { name: 'title', type: 'text', required: true },
      {
        type: 'tabs',
        tabs: [
          {
            label: 'Content',
            fields: [
              {
                name: 'layout',
                type: 'blocks',
                blocks: [
                  {
                    slug: 'hero',
                    fields: [
                      { name: 'heading', type: 'text', required: true },
                      { name: 'subheading', type: 'textarea' },
                      { name: 'image', type: 'upload', relationTo: 'media' }
                    ]
                  },
                  { slug: 'content', fields: [{ name: 'body', type: 'richText' }] },
                  {
                    slug: 'callToAction',
                    fields: [
                      { name: 'heading', type: 'text' },
                      {
                        name: 'buttons',
                        type: 'array',
                        maxRows: 2,
                        fields: [
                          { name: 'label', type: 'text', required: true },
                          { name: 'style', type: 'select', defaultValue: 'primary', options: ['primary', 'secondary'] },
                          link
                        ]
                      }
                    ]
                  },
                  {
                    slug: 'faq',
                    fields: [
                      {
                        name: 'items',
                        type: 'array',
                        fields: [
                          { name: 'question', type: 'text', required: true },
                          { name: 'answer', type: 'textarea' }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            name: 'meta',
            label: 'SEO',
            fields: [
              { name: 'title', type: 'text', admin: { placeholder: 'Falls back to the page title' } },
              { name: 'description', type: 'textarea', maxLength: 160 },
              { name: 'image', type: 'upload', relationTo: 'media' },
              { name: 'noIndex', type: 'checkbox', label: 'Hide from search engines' }
            ]
          }
        ]
      },
      { name: 'slug', type: 'slug', useAsSlug: 'title' },
      { name: 'parent', type: 'relationship', relationTo: 'pages', admin: { position: 'sidebar' } },
      { name: 'publishedAt', type: 'date', admin: { position: 'sidebar' } }
    ],
    versions: { drafts: true }
  },
  {
    slug: 'posts',
    admin: { defaultColumns: ['title', 'author', 'categories', 'publishedAt'], group: 'Content', useAsTitle: 'title' },
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'excerpt', type: 'textarea', admin: { description: 'Shown in lists and link previews' } },
      { name: 'heroImage', type: 'upload', relationTo: 'media' },
      { name: 'content', type: 'richText' },
      {
        type: 'collapsible',
        label: 'Related',
        fields: [
          { name: 'categories', type: 'relationship', hasMany: true, relationTo: 'categories' },
          { name: 'relatedPosts', type: 'relationship', hasMany: true, relationTo: 'posts' }
        ]
      },
      { name: 'slug', type: 'slug', useAsSlug: 'title' },
      { name: 'author', type: 'relationship', relationTo: 'users', admin: { position: 'sidebar' } },
      {
        name: 'publishedAt',
        type: 'date',
        admin: { date: { pickerAppearance: 'dayAndTime' }, position: 'sidebar' }
      },
      { name: 'readingTime', type: 'number', admin: { position: 'sidebar', readOnly: true } }
    ],
    versions: { drafts: true }
  },
  {
    slug: 'categories',
    admin: { group: 'Content', useAsTitle: 'name' },
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'description', type: 'textarea' },
      { name: 'parent', type: 'relationship', relationTo: 'categories' },
      { name: 'posts', type: 'join', collection: 'posts', on: 'categories' },
      {
        name: 'products',
        type: 'join',
        collection: 'products',
        on: 'categories',
        admin: { defaultColumns: ['inStock', 'title', 'price'] }
      },
      { name: 'slug', type: 'slug', useAsSlug: 'name' }
    ]
  },
  {
    slug: 'media',
    admin: { group: 'Media' },
    fields: [
      { name: 'alt', type: 'text', required: true },
      { name: 'caption', type: 'textarea' }
    ],
    upload: { mimeTypes: ['image/*'] }
  },
  {
    slug: 'products',
    admin: { defaultColumns: ['title', 'sku', 'price', 'stock', 'inStock'], group: 'Shop', useAsTitle: 'title' },
    fields: [
      { name: 'title', type: 'text', required: true },
      {
        type: 'row',
        fields: [
          { name: 'sku', type: 'text', required: true, unique: true, admin: { width: '33%' } },
          { name: 'price', type: 'number', min: 0, required: true, admin: { step: 0.01, width: '33%' } },
          { name: 'stock', type: 'number', min: 0, admin: { width: '33%' } }
        ]
      },
      { name: 'condition', type: 'radio', defaultValue: 'new', options: ['new', 'refurbished', 'used'] },
      { name: 'gallery', type: 'upload', hasMany: true, relationTo: 'media' },
      {
        type: 'collapsible',
        label: 'Details',
        fields: [
          { name: 'description', type: 'richText' },
          { name: 'specs', type: 'json' }
        ]
      },
      {
        name: 'variants',
        type: 'array',
        fields: [
          {
            type: 'row',
            fields: [
              { name: 'size', type: 'select', options: ['xs', 's', 'm', 'l', 'xl'], admin: { width: '33%' } },
              { name: 'color', type: 'text', admin: { width: '33%' } },
              { name: 'price', type: 'number', admin: { width: '33%' } }
            ]
          }
        ]
      },
      {
        name: 'supplier',
        type: 'group',
        fields: [
          { name: 'name', type: 'text' },
          {
            type: 'row',
            fields: [
              { name: 'email', type: 'email', admin: { width: '50%' } },
              { name: 'phone', type: 'text', admin: { width: '50%' } }
            ]
          }
        ]
      },
      { name: 'inStock', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
      { name: 'categories', type: 'relationship', hasMany: true, relationTo: 'categories', admin: { position: 'sidebar' } }
    ]
  },
  {
    slug: 'customers',
    admin: { defaultColumns: ['name', 'email', 'company', 'tier'], group: 'Shop', useAsTitle: 'name' },
    fields: [
      { name: 'name', type: 'text', required: true },
      {
        type: 'row',
        fields: [
          { name: 'email', type: 'email', required: true, admin: { width: '50%' } },
          { name: 'phone', type: 'text', admin: { width: '50%' } }
        ]
      },
      { name: 'company', type: 'text' },
      { name: 'tier', type: 'select', defaultValue: 'standard', options: ['standard', 'silver', 'gold'] },
      { name: 'orders', type: 'join', collection: 'orders', on: 'customer' }
    ]
  },
  {
    slug: 'orders',
    admin: {
      defaultColumns: ['orderNumber', 'customer', 'status', 'total', 'placedAt'],
      group: 'Shop',
      useAsTitle: 'orderNumber'
    },
    fields: [
      { name: 'orderNumber', type: 'text', admin: { readOnly: true } },
      { name: 'customer', type: 'relationship', relationTo: 'customers', required: true },
      {
        name: 'items',
        type: 'array',
        minRows: 1,
        fields: [
          {
            type: 'row',
            fields: [
              { name: 'product', type: 'relationship', relationTo: 'products', required: true, admin: { width: '50%' } },
              { name: 'quantity', type: 'number', defaultValue: 1, min: 1, admin: { width: '25%' } },
              { name: 'price', type: 'number', admin: { width: '25%' } }
            ]
          }
        ]
      },
      {
        name: 'shipping',
        type: 'group',
        fields: [
          { name: 'line1', type: 'text', label: 'Address' },
          {
            type: 'row',
            fields: [
              { name: 'postalCode', type: 'text', admin: { width: '33%' } },
              { name: 'city', type: 'text', admin: { width: '33%' } },
              { name: 'country', type: 'select', options: ['SE', 'NO', 'DK', 'FI', 'DE', 'GB', 'US'], admin: { width: '33%' } }
            ]
          }
        ]
      },
      { name: 'notes', type: 'textarea' },
      {
        name: 'status',
        type: 'select',
        defaultValue: 'pending',
        options: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
        admin: { position: 'sidebar' }
      },
      { name: 'total', type: 'number', admin: { position: 'sidebar', readOnly: true } },
      { name: 'placedAt', type: 'date', admin: { position: 'sidebar' } }
    ]
  }
]

export const globals: GlobalConfig[] = [
  {
    slug: 'site-settings',
    admin: { group: 'Settings' },
    fields: [
      {
        type: 'tabs',
        tabs: [
          {
            label: 'General',
            fields: [
              { name: 'siteName', type: 'text', required: true },
              { name: 'tagline', type: 'text' },
              { name: 'logo', type: 'upload', relationTo: 'media' }
            ]
          },
          {
            label: 'SEO',
            fields: [
              { name: 'defaultTitle', type: 'text' },
              { name: 'defaultDescription', type: 'textarea' }
            ]
          },
          {
            label: 'Social',
            fields: [
              {
                name: 'social',
                type: 'array',
                fields: [
                  {
                    type: 'row',
                    fields: [
                      {
                        name: 'platform',
                        type: 'select',
                        options: ['github', 'linkedin', 'x', 'youtube'],
                        admin: { width: '33%' }
                      },
                      { name: 'url', type: 'text', admin: { width: '67%' } }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    slug: 'header',
    admin: { group: 'Settings' },
    fields: [{ name: 'navItems', type: 'array', maxRows: 6, fields: [{ name: 'label', type: 'text', required: true }, link] }]
  },
  {
    slug: 'footer',
    admin: { group: 'Settings' },
    fields: [
      {
        name: 'columns',
        type: 'array',
        fields: [
          { name: 'heading', type: 'text' },
          { name: 'links', type: 'array', fields: [{ name: 'label', type: 'text' }, link] }
        ]
      },
      { name: 'copyright', type: 'text' }
    ]
  }
]
