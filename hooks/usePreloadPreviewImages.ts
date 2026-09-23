'use client'

import { useEffect, useRef } from 'react'
import { collectPreviewImageUrls, preloadImageUrls } from '../lib/preloadImages'

export function usePreloadPreviewImages(
  images: Array<{ asset?: any }>,
  projects: Array<{ images?: Array<{ asset?: any }> }>
) {
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    if (images.length === 0 && projects.length === 0) return

    const urls = collectPreviewImageUrls(images, projects)
    if (urls.length === 0) return

    startedRef.current = true
    preloadImageUrls(urls)
  }, [images, projects])
}
