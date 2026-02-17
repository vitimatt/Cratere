import { notFound } from 'next/navigation'
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

  for (const candidate of candidates) {
    const doc = await client.fetch<{ asset?: { _id?: string } } | null>(
      `*[_type == "privateMedia" && file.asset->originalFilename == $filename][0]{
        "asset": file.asset-> { _id }
      }`,
      { filename: candidate }
    )

    if (doc?.asset?._id) {
      const pdfUrl = `/api/media-proxy?filename=${encodeURIComponent(candidate)}`
      return (
        <div style={{ margin: 0, height: '100vh', overflow: 'hidden' }}>
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            title="PDF Viewer"
          />
        </div>
      )
    }
  }

  notFound()
}
