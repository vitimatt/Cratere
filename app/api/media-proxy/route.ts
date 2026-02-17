import { NextRequest, NextResponse } from 'next/server'
import { client } from '../../../lib/sanity'

const PROJECT_ID = 'jeo4p1su'
const DATASET = 'production'

function buildSanityFileUrl(assetId: string): string {
  const cleanId = assetId.replace(/^file-/, '')
  return `https://cdn.sanity.io/files/${PROJECT_ID}/${DATASET}/${cleanId}.pdf`
}

export async function GET(request: NextRequest) {
  const filename = request.nextUrl.searchParams.get('filename')
  if (!filename?.trim()) {
    return NextResponse.json({ error: 'Missing filename' }, { status: 400 })
  }

  const candidates = [
    filename,
    filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
  ]

  for (const candidate of candidates) {
    const doc = await client.fetch<{ asset?: { _id?: string; url?: string } } | null>(
      `*[_type == "privateMedia" && file.asset->originalFilename == $filename][0]{
        "asset": file.asset-> { _id, url }
      }`,
      { filename: candidate }
    )

    if (doc?.asset) {
      const url = doc.asset.url || buildSanityFileUrl(doc.asset._id!)
      try {
        const res = await fetch(url)
        if (!res.ok) continue
        const blob = await res.blob()
        return new NextResponse(blob, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${candidate}"`,
          },
        })
      } catch (err) {
        console.error('Failed to fetch PDF:', err)
        return NextResponse.json({ error: 'Failed to load PDF' }, { status: 502 })
      }
    }
  }

  return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
}
