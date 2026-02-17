import { NextResponse } from 'next/server'
import { client } from '../../../lib/sanity'

const PROJECT_ID = 'jeo4p1su'
const DATASET = 'production'

function buildSanityFileUrl(assetId: string): string {
  const cleanId = assetId.replace(/^file-/, '')
  return `https://cdn.sanity.io/files/${PROJECT_ID}/${DATASET}/${cleanId}.pdf`
}

export async function GET() {
  const settings = await client.fetch<{ portfolioPdf?: { asset?: { _id?: string; url?: string } } } | null>(
    `*[_type == "siteSettings"][0] {
      portfolioPdf {
        asset-> { _id, url }
      }
    }`
  )

  const asset = settings?.portfolioPdf?.asset
  if (!asset?._id) {
    return NextResponse.json({ error: 'Portfolio PDF not found' }, { status: 404 })
  }

  const url = asset.url || buildSanityFileUrl(asset._id)
  try {
    const res = await fetch(url)
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to load PDF' }, { status: 502 })
    }
    const blob = await res.blob()
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="portfolio.pdf"',
      },
    })
  } catch (err) {
    console.error('Failed to fetch portfolio PDF:', err)
    return NextResponse.json({ error: 'Failed to load PDF' }, { status: 502 })
  }
}
