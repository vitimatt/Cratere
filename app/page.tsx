import { client } from '../lib/sanity'
import ImageList from './components/ImageList'

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getProjects() {
  const projects = await client.fetch(`
    *[_type == "project"] | order(year desc) {
      title,
      client,
      year,
      images[] {
        asset,
        "assetMetadata": asset-> {
          originalFilename
        },
        title
      }
    }
  `)
  return projects
}

// Helper function to extract title from filename (similar to ImageList component)
function extractTitleFromFilename(asset: any, assetMetadata?: any, imageTitle?: string): string {
  // Use image title if available
  if (imageTitle) return imageTitle
  
  let filename = ''
  
  // Try to get original filename from metadata first
  if (assetMetadata?.originalFilename) {
    filename = assetMetadata.originalFilename
  } else if (asset?.originalFilename) {
    filename = asset.originalFilename
  } else if (asset?._ref) {
    // Fallback: try to extract from asset reference
    const parts = asset._ref.split('-')
    if (parts.length > 0) {
      filename = parts[parts.length - 1]
    }
  }
  
  if (!filename) return 'Untitled'
  
  // Remove file extension
  filename = filename.replace(/\.[^/.]+$/, '')
  
  // Split by '-' to separate title from color
  // Everything before the last '-' is the title
  const parts = filename.split('-')
  if (parts.length > 1) {
    // Join all parts except the last one (which is the color)
    const titlePart = parts.slice(0, -1).join('-')
    // Replace underscores with spaces
    return titlePart.replace(/_/g, ' ').trim()
  } else {
    // No '-' found, just replace underscores with spaces
    return filename.replace(/_/g, ' ').trim()
  }
}

export default async function Home() {
  const projects = await getProjects()
  
  // Flatten all images from all projects into a single list
  const allImages: Array<{
    asset: any
    title?: string
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
            year: project.year,
            index: globalIndex++,
            assetMetadata: image.assetMetadata,
          })
        }
      })
    }
  })

  // Sort images alphabetically by subject (title)
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
      <ImageList images={allImages} projects={projects} />
    </main>
  )
}
