import { urlFor } from './imageUrl'

export const PREVIEW_IMAGE_WIDTH = 2000

export function previewImageUrl(asset: any): string {
  if (!asset) return ''
  return urlFor(asset).width(PREVIEW_IMAGE_WIDTH).url()
}
