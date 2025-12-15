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

  return (
    <main className="min-h-screen bg-white">
      <ImageList images={allImages} projects={projects} />
    </main>
  )
}
