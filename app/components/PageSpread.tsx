'use client'

import { useDesigner } from '../contexts/DesignerContext'
import ImageSlot from './ImageSlot'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ImageData {
  asset: any
  title?: string
  year: number
  index: number
  assetMetadata?: any
}

interface PageSpreadProps {
  pageNumber: number
  isSinglePage?: boolean
  slots: Array<{ id: string; width: string; height: string; left?: string; top?: string; aspectRatio?: 'square' | '3:2' | '2:3' | 'free'; cropMode?: 'fill' | 'fit' }>
  isLayoutPreviewMode?: boolean
  previewLayout?: string | null
}

export default function PageSpread({ pageNumber, isSinglePage = false, slots, isLayoutPreviewMode = false, previewLayout = null }: PageSpreadProps) {
  const { selectedImages, setSelectionContext, setCurrentPage } = useDesigner()
  const router = useRouter()
  const [cursorText, setCursorText] = useState<string>('')
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  useEffect(() => {
    setCurrentPage(pageNumber)
  }, [pageNumber, setCurrentPage])

  // A4 ratio: 210mm / 297mm = 0.707
  const A4_RATIO = 210 / 297

  const handleSlotClick = (slotId: string) => {
    // For right-side slots in two-page spreads, use pageNumber + 1
    const actualPageNumber = !isSinglePage && slotId.startsWith('right-') 
      ? pageNumber + 1 
      : pageNumber
    setSelectionContext({ pageNumber: actualPageNumber, slotId })
    router.push('/')
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const isLeftClick = clickX < width / 2

    // Check if mouse is over an image slot - hide navigation tooltip immediately
    const target = e.target as HTMLElement
    if (target.closest('[data-image-slot]')) {
      setCursorText('')
      return
    }

    // Check if mouse is in top or bottom 80px areas (don't show navigation cursor there)
    const mouseY = e.clientY - rect.top
    const viewportHeight = window.innerHeight
    if (mouseY < 80 || mouseY > viewportHeight - 80) {
      setCursorText('')
      return
    }

    // Update position immediately
    setCursorPosition({ x: e.clientX, y: e.clientY })

    if (isLeftClick && pageNumber > 1) {
      setCursorText('Previous')
    } else if (!isLeftClick && pageNumber < 32) {
      setCursorText('Next')
    } else {
      setCursorText('')
    }
  }

  const handleMouseLeave = () => {
    setCursorText('')
  }

  const handleNavigationClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't allow navigation when in layout preview mode
    if (isLayoutPreviewMode) {
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const isLeftClick = clickX < width / 2

    // Check if click was on an image slot
    const target = e.target as HTMLElement
    if (target.closest('[data-image-slot]')) {
      return
    }

    // Allow navigation from top/bottom areas
    if (isLeftClick && pageNumber > 1) {
      // Navigate to previous spread
      let prevPage: number
      if (pageNumber === 2) {
        prevPage = 1
      } else if (pageNumber === 3) {
        prevPage = 1
      } else {
        prevPage = pageNumber - 2
      }
      router.push(`/designer?page=${prevPage}`)
    } else if (!isLeftClick && pageNumber < 32) {
      // Navigate to next spread
      let nextPage: number
      if (isSinglePage) {
        nextPage = pageNumber + 1
      } else if (pageNumber === 30) {
        nextPage = 32
      } else {
        nextPage = pageNumber + 2
      }
      router.push(`/designer?page=${nextPage}`)
    }
  }

  const getImageForSlot = (slotId: string): ImageData | null | undefined => {
    // For right-side slots in two-page spreads, use pageNumber + 1
    const actualPageNumber = !isSinglePage && slotId.startsWith('right-') 
      ? pageNumber + 1 
      : pageNumber
    const key = `${actualPageNumber}-${slotId}`
    // Return undefined if key doesn't exist (not set yet), null if explicitly set to empty
    return selectedImages.has(key) ? selectedImages.get(key) || null : undefined
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
        onClick={handleNavigationClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: isSinglePage ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          backgroundColor: '#fff',
          gap: '0',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
      {isSinglePage ? (
        <div
            style={{
              width: 'auto',
              height: 'calc(100vh - 160px)',
              maxHeight: 'calc(100vh - 160px)',
              aspectRatio: `${A4_RATIO}`,
              margin: 'auto',
              position: 'relative',
              backgroundColor: '#fff',
              border: '1px solid rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
          {slots.map((slot) => {
            // Convert slot dimensions to percentage of page for proper scaling
            // A4 dimensions: 210mm x 297mm
            const slotLeftPercent = (parseFloat(slot.left?.replace('mm', '') || '0') / 210) * 100
            const slotTopPercent = (parseFloat(slot.top?.replace('mm', '') || '0') / 297) * 100
            const slotWidthPercent = (parseFloat(slot.width.replace('mm', '')) / 210) * 100
            const slotHeightPercent = (parseFloat(slot.height.replace('mm', '')) / 297) * 100
            
            return (
              <div
                key={slot.id}
                data-image-slot
                style={{
                  position: 'absolute',
                  left: `${slotLeftPercent}%`,
                  top: `${slotTopPercent}%`,
                  width: `${slotWidthPercent}%`,
                  height: `${slotHeightPercent}%`,
                }}
              >
                <ImageSlot
                  slotId={slot.id}
                  pageNumber={pageNumber}
                  image={getImageForSlot(slot.id)}
                  onClick={() => handleSlotClick(slot.id)}
                  width="100%"
                  height="100%"
                  aspectRatio={slot.aspectRatio}
                  cropMode={slot.cropMode}
                  isPreviewMode={isLayoutPreviewMode}
                />
              </div>
            )
          })}
        </div>
      ) : (
        <>
          {/* Left page */}
          <div
            style={{
              width: 'auto',
              height: 'calc(100vh - 160px)',
              maxHeight: 'calc(100vh - 160px)',
              aspectRatio: `${A4_RATIO}`,
              position: 'relative',
              backgroundColor: '#fff',
              borderTop: '1px solid rgba(0, 0, 0, 0.04)',
              borderRight: 'none',
              borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
              borderLeft: '1px solid rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            {slots
              .filter((slot) => slot.id.startsWith('left-'))
              .map((slot) => {
                const slotLeftPercent = (parseFloat(slot.left?.replace('mm', '') || '0') / 210) * 100
                const slotTopPercent = (parseFloat(slot.top?.replace('mm', '') || '0') / 297) * 100
                const slotWidthPercent = (parseFloat(slot.width.replace('mm', '')) / 210) * 100
                const slotHeightPercent = (parseFloat(slot.height.replace('mm', '')) / 297) * 100
                
                return (
                  <div
                    key={slot.id}
                    data-image-slot
                    style={{
                      position: 'absolute',
                      left: `${slotLeftPercent}%`,
                      top: `${slotTopPercent}%`,
                      width: `${slotWidthPercent}%`,
                      height: `${slotHeightPercent}%`,
                    }}
                  >
                    <ImageSlot
                      slotId={slot.id}
                      pageNumber={pageNumber}
                      image={getImageForSlot(slot.id)}
                      onClick={() => handleSlotClick(slot.id)}
                      width="100%"
                      height="100%"
                      aspectRatio={slot.aspectRatio}
                      cropMode={slot.cropMode}
                      isPreviewMode={isLayoutPreviewMode}
                    />
                  </div>
                )
              })}
          </div>
          {/* Right page */}
          <div
            style={{
              width: 'auto',
              height: 'calc(100vh - 160px)',
              maxHeight: 'calc(100vh - 160px)',
              aspectRatio: `${A4_RATIO}`,
              position: 'relative',
              backgroundColor: '#fff',
              borderTop: '1px solid rgba(0, 0, 0, 0.04)',
              borderRight: '1px solid rgba(0, 0, 0, 0.04)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
              borderLeft: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            {slots
              .filter((slot) => slot.id.startsWith('right-'))
              .map((slot) => {
                const slotLeftPercent = (parseFloat(slot.left?.replace('mm', '') || '0') / 210) * 100
                const slotTopPercent = (parseFloat(slot.top?.replace('mm', '') || '0') / 297) * 100
                const slotWidthPercent = (parseFloat(slot.width.replace('mm', '')) / 210) * 100
                const slotHeightPercent = (parseFloat(slot.height.replace('mm', '')) / 297) * 100
                
                return (
                  <div
                    key={slot.id}
                    data-image-slot
                    style={{
                      position: 'absolute',
                      left: `${slotLeftPercent}%`,
                      top: `${slotTopPercent}%`,
                      width: `${slotWidthPercent}%`,
                      height: `${slotHeightPercent}%`,
                    }}
                  >
                    <ImageSlot
                      slotId={slot.id}
                      pageNumber={pageNumber}
                      image={getImageForSlot(slot.id)}
                      onClick={() => handleSlotClick(slot.id)}
                      width="100%"
                      height="100%"
                      aspectRatio={slot.aspectRatio}
                      cropMode={slot.cropMode}
                      isPreviewMode={isLayoutPreviewMode}
                    />
                  </div>
                )
              })}
          </div>
        </>
      )}
      </div>
    </>
  )
}

