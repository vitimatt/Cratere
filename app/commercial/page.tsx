import { client } from '../../lib/sanity'
import CommercialImageList from '../components/CommercialImageList'

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
        title
      }
    }
  `)
  return projects
}

export default async function Commercial() {
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
      <CommercialImageList images={allImages} projects={projects} />
    </main>
  )
}

