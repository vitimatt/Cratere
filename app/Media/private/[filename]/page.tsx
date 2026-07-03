import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import PdfEmbed from '../../../components/PdfEmbed'
import { isMobileUserAgent } from '../../../../lib/isMobileUserAgent'
import { client } from '../../../../lib/sanity'

export const dynamic = 'force-dynamic'

export default async function PrivateMediaPage({
  params,
}: {
  params: Promise<{ filename: string }>
}) {
  const { filename } = await params
  if (!filename?.trim()) notFound()

  const candidates = [
    filename,
    filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
  ]

  const userAgent = (await headers()).get('user-agent')
  const isMobile = isMobileUserAgent(userAgent)

  for (const candidate of candidates) {
    const doc = await client.fetch<{ asset?: { _id?: string } } | null>(
      `*[_type == "privateMedia" && file.asset->originalFilename == $filename][0]{
        "asset": file.asset-> { _id }
      }`,
      { filename: candidate }
    )

    if (doc?.asset?._id) {
      const pdfUrl = `/api/media-proxy?filename=${encodeURIComponent(candidate)}`
      if (isMobile) {
        redirect(pdfUrl)
      }
      return <PdfEmbed src={pdfUrl} title="PDF Viewer" />
    }
  }

  notFound()
}
