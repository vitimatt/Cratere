import { previewImageUrl } from './previewImageUrl'

const PRELOAD_CONCURRENCY = 8

function preloadOne(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
}

export async function preloadImageUrls(urls: string[]): Promise<void> {
  const unique = [...new Set(urls.filter(Boolean))]
  for (let i = 0; i < unique.length; i += PRELOAD_CONCURRENCY) {
    const batch = unique.slice(i, i + PRELOAD_CONCURRENCY)
    await Promise.all(batch.map(preloadOne))
  }
}

export function collectPreviewImageUrls(
  images: Array<{ asset?: any }>,
  projects: Array<{ images?: Array<{ asset?: any }> }>
): string[] {
  const urls: string[] = []
  for (const image of images) {
    if (image?.asset) urls.push(previewImageUrl(image.asset))
  }
  for (const project of projects) {
    for (const image of project.images || []) {
      if (image?.asset) urls.push(previewImageUrl(image.asset))
    }
  }
  return urls
}
