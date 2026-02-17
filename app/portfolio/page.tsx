import { notFound } from 'next/navigation'
import { client } from '../../lib/sanity'

export const dynamic = 'force-dynamic'

export default async function PortfolioPage() {
  const settings = await client.fetch<{ portfolioPdf?: { asset?: { _id?: string } } } | null>(
    `*[_type == "siteSettings"][0] {
      portfolioPdf {
        asset-> { _id }
      }
    }`
  )

  if (!settings?.portfolioPdf?.asset?._id) {
    notFound()
  }

  return (
    <div style={{ margin: 0, height: '100vh', overflow: 'hidden' }}>
      <iframe
        src="/api/portfolio-pdf"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title="Portfolio PDF"
      />
    </div>
  )
}
