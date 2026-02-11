import { client } from '../../lib/sanity'
import CommercialImageList from '../components/CommercialImageList'

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getProjects() {
  const projects = await client.fetch(`
    *[_type == "project"] | order(year desc) {
      title,
      client,
      year,
      pdf {
        asset-> {
          _id,
          url,
          originalFilename
        }
      },
      images[] {
        asset,
        "assetMetadata": asset-> {
          originalFilename
        },
        title,
        color
      }
    }
  `)
  return projects
}

// Helper function to extract title from filename (same as homepage)
function extractTitleFromFilename(asset: any, assetMetadata?: any, imageTitle?: string): string {
  if (imageTitle) return imageTitle
  let filename = ''
  if (assetMetadata?.originalFilename) {
    filename = assetMetadata.originalFilename
  } else if (asset?.originalFilename) {
    filename = asset.originalFilename
  } else if (asset?._ref) {
    const parts = asset._ref.split('-')
    if (parts.length > 0) filename = parts[parts.length - 1]
  }
  if (!filename) return 'Untitled'
  filename = filename.replace(/\.[^/.]+$/, '')
  const parts = filename.split('-')
  if (parts.length > 1) {
    const titlePart = parts.slice(0, -1).join('-')
    return titlePart.replace(/_/g, ' ').trim()
  }
  return filename.replace(/_/g, ' ').trim()
}

export default async function Commercial() {
  const projects = await getProjects()
  
  // Flatten all images from all projects into a single list
  const allImages: Array<{
    asset: any
    title?: string
    color?: string
    year: number
    index: number
    assetMetadata?: any
  }> = []
  
  let globalIndex = 1
  projects.forEach((project: any) => {
    if (project.images && Array.isArray(project.images)) {
      project.images.forEach((image: any) => {
        if (image.asset) {
          allImages.push({
            asset: image.asset,
            title: image.title,
            color: image.color,
            year: project.year,
            index: globalIndex++,
            assetMetadata: image.assetMetadata,
          })
        }
      })
    }
  })

  // Sort images alphabetically by subject (title) - same as homepage
  allImages.sort((a, b) => {
    const titleA = extractTitleFromFilename(a.asset, a.assetMetadata, a.title).toLowerCase()
    const titleB = extractTitleFromFilename(b.asset, b.assetMetadata, b.title).toLowerCase()
    return titleA.localeCompare(titleB)
  })

  // Re-index images after sorting
  allImages.forEach((image, index) => {
    image.index = index + 1
  })

  return (
    <main className="min-h-screen bg-white">
      <CommercialImageList images={allImages} projects={projects} />
    </main>
  )
}

