'use client'

import { useEffect } from 'react'

function isMobileLikeDevice(): boolean {
  const ua = navigator.userAgent
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true
  // iPadOS desktop mode: reports as Mac with touch
  if (/\bMacintosh\b/.test(ua) && navigator.maxTouchPoints > 1) return true
  return window.matchMedia('(max-width: 768px)').matches && 'ontouchstart' in window
}

export default function MobilePdfFallback({ src }: { src: string }) {
  useEffect(() => {
    if (isMobileLikeDevice()) {
      window.location.replace(src)
    }
  }, [src])

  return null
}
