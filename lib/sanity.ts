import { createClient } from 'next-sanity'

export const client = createClient({
  projectId: 'jeo4p1su',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-01-01',
})

