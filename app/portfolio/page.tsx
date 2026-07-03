import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import PdfEmbed from '../components/PdfEmbed'
import { isMobileUserAgent } from '../../lib/isMobileUserAgent'
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

  const pdfUrl = '/api/portfolio-pdf'
  const userAgent = (await headers()).get('user-agent')
  if (isMobileUserAgent(userAgent)) {
    redirect(pdfUrl)
  }

  return <PdfEmbed src={pdfUrl} title="Portfolio PDF" />
}
