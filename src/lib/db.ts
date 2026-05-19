import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:data/materials.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
})

export default client
