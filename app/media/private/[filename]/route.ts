import { NextRequest, NextResponse } from 'next/server'
import { client } from '../../../../lib/sanity'

const PROJECT_ID = 'jeo4p1su'
const DATASET = 'production'

function buildSanityFileUrl(assetId: string, extension = 'pdf'): string {
  const cleanId = assetId.replace(/^file-/, '')
  return `https://cdn.sanity.io/files/${PROJECT_ID}/${DATASET}/${cleanId}.${extension}`
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params
  if (!filename || !filename.trim()) {
    return NextResponse.json({ error: 'Missing filename' }, { status: 400 })
  }

  // Try exact filename first, then with .pdf suffix
  const candidates = [filename, filename.endsWith('.pdf') ? filename : `${filename}.pdf`]

  for (const candidate of candidates) {
    const doc = await client.fetch<{ asset?: { _id?: string } } | null>(
      `*[_type == "privateMedia" && file.asset->originalFilename == $filename][0]{
        "asset": file.asset-> { _id }
      }`,
      { filename: candidate }
    )

    if (doc?.asset?._id) {
      const url = buildSanityFileUrl(doc.asset._id)
      try {
        const res = await fetch(url)
        if (!res.ok) {
          continue
        }
        const blob = await res.blob()
        const contentType = res.headers.get('content-type') || 'application/pdf'
        return new NextResponse(blob, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${candidate}"`,
          },
        })
      } catch (err) {
        console.error('Failed to fetch PDF from Sanity:', err)
        return NextResponse.json({ error: 'Failed to load PDF' }, { status: 502 })
      }
    }
  }

  return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
}
