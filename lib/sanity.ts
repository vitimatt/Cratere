import { createClient } from 'next-sanity'

export const client = createClient({
  projectId: 'jeo4p1su',
  dataset: 'production',
  // Disable CDN in development to ensure fresh data, enable in production for better performance
  useCdn: process.env.NODE_ENV === 'production',
  apiVersion: '2024-01-01',
})


