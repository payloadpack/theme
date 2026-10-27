import { randomUUID } from 'node:crypto'
import type { Payload } from 'payload'

export const demoUser = { email: 'demo@payloadpack.com', password: 'demo' }

export async function seed(payload: Payload) {
  const { totalDocs } = await payload.count({ collection: 'users', overrideAccess: true })
  if (totalDocs > 0) {
    return
  }

  const user = await payload.create({
    collection: 'users',
    data: { ...demoUser, apiKey: randomUUID(), enableAPIKey: true },
    overrideAccess: true
  })

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
