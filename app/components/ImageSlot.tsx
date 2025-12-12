'use client'

import { useState } from 'react'
import { urlFor } from '../../lib/imageUrl'

interface ImageData {
  asset: any
  title?: string
  year: number
  index: number
  assetMetadata?: any
}

interface ImageSlotProps {
  slotId: string
  pageNumber: number
  image: ImageData | null | undefined
  onClick: () => void
  width?: string
  height?: string
  aspectRatio?: 'square' | '3:2' | '2:3' | 'free'
  cropMode?: 'fill' | 'fit'
  isPreviewMode?: boolean
}

export default function ImageSlot({ 
  slotId, 
  pageNumber, 
  image, 
  onClick, 
  width = '100%', 
  height = '100%',
  aspectRatio = '2:3',
  cropMode = 'fit',
  isPreviewMode = false
}: ImageSlotProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null)
  const [cursorText, setCursorText] = useState<string>('')
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const aspectRatio = img.naturalWidth / img.naturalHeight
    setImageAspectRatio(aspectRatio)
    setImageLoaded(true)
  }

  // Determine if image is horizontal (width > height)
  const isHorizontal = imageAspectRatio !== null && imageAspectRatio > 1
  
  // Check if this is the cover image (page 1, cover-1 slot)
  const isCoverImage = pageNumber === 1 && slotId === 'cover-1'

  // Get aspect ratio CSS value
  const getAspectRatioCSS = () => {
    if (aspectRatio === 'free' || isCoverImage) return undefined
    if (aspectRatio === 'square') return '1 / 1'
    if (aspectRatio === '3:2') return '3 / 2'
    if (aspectRatio === '2:3') return '2 / 3'
    return '2 / 3' // default
  }

  // Determine object fit based on crop mode
  const getObjectFit = () => {
    if (isPreviewMode) return 'none' // Don't show image in preview mode
    if (cropMode === 'fill') return 'cover' // Fill the box, crop if needed
    return 'contain' // Fit within box, maintain aspect ratio
  }

  // Determine object position
  const getObjectPosition = () => {
    if (aspectRatio === '3:2' && cropMode === 'fill') {
      // For horizontal images that need to fill, center them
      return 'center center'
    }
    if (aspectRatio === '2:3' && cropMode === 'fill') {
      // For vertical images that need to fill, center them
      return 'center center'
    }
    if (isCoverImage && isHorizontal) return 'top center'
    if (isHorizontal) return 'top center'
    return 'center center'
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Update position immediately
    setCursorPosition({ x: e.clientX, y: e.clientY })
    setCursorText(image ? 'Change image' : 'Select image')
  }

  const handleMouseLeave = () => {
    setCursorText('')
  }

  return (
    <>
      {cursorText && (
        <div
          style={{
            position: 'fixed',
            left: `${cursorPosition.x}px`,
            top: `${cursorPosition.y}px`,
            pointerEvents: 'none',
            zIndex: 10000,
            fontSize: '14px',
            color: '#000',
            transform: 'translate(15px, 0px)',
            whiteSpace: 'nowrap',
          }}
        >
          {cursorText}
        </div>
      )}
      <div
        onClick={isPreviewMode ? undefined : onClick}
        onMouseMove={isPreviewMode ? undefined : handleMouseMove}
        onMouseLeave={isPreviewMode ? undefined : handleMouseLeave}
        style={{
          width,
          height,
          backgroundColor: isPreviewMode ? '#EFEFEF' : (image ? 'transparent' : image === null ? '#FFFFFF' : '#EFEFEF'),
          border: 'none',
          cursor: isPreviewMode ? 'default' : 'pointer',
          position: 'relative',
          overflow: isPreviewMode ? 'visible' : 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          aspectRatio: getAspectRatioCSS(),
        }}
      >
      {!isPreviewMode && image && (
        <img
          src={urlFor(image.asset).width(1200).url()}
          alt={image.title || `Image ${image.index}`}
          onLoad={handleImageLoad}
          style={{
            width: '100%',
            height: '100%',
            objectFit: getObjectFit(),
            objectPosition: getObjectPosition(),
          }}
        />
      )}
      </div>
    </>
  )
}

