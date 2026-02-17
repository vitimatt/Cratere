'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// Mobile: vertical position (px from viewport top) - fallback when ref unavailable
const MOBILE_DETECTION_LINE = 23
import { useRouter } from 'next/navigation'
import { urlFor } from '../../lib/imageUrl'
import { useDesigner, LayoutType } from '../contexts/DesignerContext'

interface ImageItem {
  asset: any
  title?: string
  color?: string
  year: number
  index: number
  assetMetadata?: any
}

interface Project {
  title: string
  client: string
  year: number
  images: Array<{
    asset: any
    assetMetadata?: any
    title?: string
    color?: string
  }>
}

interface ImageListProps {
  images: ImageItem[]
  projects: Project[]
}

export default function ImageList({ images, projects }: ImageListProps) {
  const router = useRouter()
  const { selectionContext, setSelectedImage, setSelectionContext, getLayout } = useDesigner()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [hoveredProjectIndex, setHoveredProjectIndex] = useState<number | null>(null)
  const [hoveredProjectImageIndex, setHoveredProjectImageIndex] = useState<number | null>(null)
  const [hoveredColor, setHoveredColor] = useState<string | null>(null)
  const [hoveredColorImage, setHoveredColorImage] = useState<ImageItem | null>(null)
  const [hoveredRandomly, setHoveredRandomly] = useState<boolean>(false)
  const [randomImageIndex, setRandomImageIndex] = useState<number | null>(null)
  const [expandedAbout, setExpandedAbout] = useState<boolean>(false)
  const [visibleRowCount, setVisibleRowCount] = useState<number>(0)
  const [isReady, setIsReady] = useState<boolean>(false)
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [centeredImageIndex, setCenteredImageIndex] = useState<number | null>(null)
  const [centeredProjectIndex, setCenteredProjectIndex] = useState<{ projectIndex: number; imageIndex: number } | null>(null)
  const [centeredColor, setCenteredColor] = useState<string | null>(null)
  const [centeredRandomly, setCenteredRandomly] = useState<boolean>(false)
  
  const isSelectionMode = selectionContext !== null
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map())
  const bySubjectRef = useRef<HTMLDivElement>(null)
  const byCommissionerRef = useRef<HTMLDivElement>(null)
  const mousePosRef = useRef<{ x: number; y: number } | null>(null)
  const imageColumnRef = useRef<HTMLDivElement | null>(null)
  const randomlyImageIndexRef = useRef<number | null>(null)
  const visibleRowCountRef = useRef(0)
  const rowIdToIndexRef = useRef<Map<string, number>>(new Map())
  const detectionLineRef = useRef<HTMLDivElement>(null)

  const updateHoverFromPosition = useCallback(() => {
    if (isMobile) return
    const pos = mousePosRef.current
    if (!pos || !imageColumnRef.current) return
    const el = document.elementFromPoint(pos.x, pos.y)
    if (!el || !imageColumnRef.current.contains(el)) {
      setHoveredIndex(null)
      setHoveredProjectIndex(null)
      setHoveredProjectImageIndex(null)
      setHoveredColor(null)
      setHoveredColorImage(null)
      setHoveredRandomly(false)
      setRandomImageIndex(null)
      return
    }
    const checkVisible = (rowId: string) => {
      const idx = rowIdToIndexRef.current.get(rowId)
      return idx !== undefined && idx < visibleRowCountRef.current
    }
    const imageRow = el.closest('.image-row') as HTMLElement | null
    if (imageRow) {
      const idx = imageRow.getAttribute('data-image-index')
      if (idx !== null && checkVisible(`image-${idx}`)) {
        const index = parseInt(idx, 10)
        setHoveredIndex(images[index]?.index ?? null)
        setHoveredProjectIndex(null)
        setHoveredProjectImageIndex(null)
        setHoveredColor(null)
        setHoveredColorImage(null)
        setHoveredRandomly(false)
        setRandomImageIndex(null)
        return
      }
    }
    const projectSection = el.closest('.project-image-section') as HTMLElement | null
    if (projectSection) {
      const pIdx = projectSection.getAttribute('data-project-index')
      const imgIdx = projectSection.getAttribute('data-project-image-index')
      if (pIdx !== null && imgIdx !== null && checkVisible(`project-${pIdx}`)) {
        setHoveredIndex(null)
        setHoveredProjectIndex(parseInt(pIdx, 10))
        setHoveredProjectImageIndex(parseInt(imgIdx, 10))
        setHoveredColor(null)
        setHoveredColorImage(null)
        setHoveredRandomly(false)
        setRandomImageIndex(null)
        return
      }
    }
    const colorRow = el.closest('.color-row') as HTMLElement | null
    if (colorRow) {
      const cKey = colorRow.getAttribute('data-color-key')
      if (cKey && checkVisible(`color-${cKey}`)) {
        const randomImage = getRandomImageForColor(cKey)
        setHoveredIndex(null)
        setHoveredProjectIndex(null)
        setHoveredProjectImageIndex(null)
        setHoveredColor(cKey)
        setHoveredColorImage(randomImage)
        setHoveredRandomly(false)
        setRandomImageIndex(null)
        return
      }
    }
    const randomlyRow = el.closest('.randomly-row')
    if (randomlyRow && checkVisible('randomly')) {
      const validImages = images.filter(img => img?.asset)
      if (validImages.length > 0) {
        const rnd = Math.floor(Math.random() * validImages.length)
        setHoveredIndex(null)
        setHoveredProjectIndex(null)
        setHoveredProjectImageIndex(null)
        setHoveredColor(null)
        setHoveredColorImage(null)
        setHoveredRandomly(true)
        setRandomImageIndex(rnd)
        return
      }
    }
    setHoveredIndex(null)
    setHoveredProjectIndex(null)
    setHoveredProjectImageIndex(null)
    setHoveredColor(null)
    setHoveredColorImage(null)
    setHoveredRandomly(false)
    setRandomImageIndex(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, isMobile])

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 0)
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  useEffect(() => {
    // Prefetch designer pages for instant navigation
    for (let p = 1; p <= 5; p++) {
      router.prefetch(`/designer?page=${p}`)
    }
  }, [router])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY }
    }
    const handleScroll = () => {
      requestAnimationFrame(updateHoverFromPosition)
    }
    document.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [updateHoverFromPosition])

  const extractTitleFromFilename = (asset: any, assetMetadata?: any): string => {
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

  const extractColorFromFilename = (asset: any, assetMetadata?: any): string | null => {
    let filename = ''
    
    if (assetMetadata?.originalFilename) {
      filename = assetMetadata.originalFilename
    } else if (asset?.originalFilename) {
      filename = asset.originalFilename
    } else if (asset?._ref) {
      const parts = asset._ref.split('-')
      if (parts.length > 0) {
        filename = parts[parts.length - 1]
      }
    }
    
    if (!filename) return null
    
    filename = filename.replace(/\.[^/.]+$/, '')
    const parts = filename.split('-')
    if (parts.length > 1) {
      // Last part is the color
      return parts[parts.length - 1].trim()
    }
    return null
  }

  const normalizeColorKey = (color: string): string => {
    return color
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const getColorLabel = (rawColor: string): string => rawColor.trim()

  // Group images by color (prefer explicit color field, fallback to filename)
  const imagesByColor = useMemo(() => images.reduce((acc, image) => {
    const rawColor = (image.color && image.color.trim()) || extractColorFromFilename(image.asset, image.assetMetadata)
    if (!rawColor) {
      return acc
    }

    const key = normalizeColorKey(rawColor)
    if (!key) {
      return acc
    }

    if (!acc[key]) {
      acc[key] = {
        label: getColorLabel(rawColor),
        images: [],
      }
    }

    if (!acc[key].label && rawColor.trim()) {
      acc[key].label = getColorLabel(rawColor)
    }

    acc[key].images.push(image)
    return acc
  }, {} as Record<string, { label: string; images: ImageItem[] }>), [images])

  const colors = useMemo(() => Object.keys(imagesByColor).sort((a, b) => {
    const labelA = imagesByColor[a]?.label?.toLowerCase() ?? ''
    const labelB = imagesByColor[b]?.label?.toLowerCase() ?? ''
    return labelA.localeCompare(labelB)
  }), [imagesByColor])

  const allRowIdsOrdered = useMemo(() => {
    const base = [
      'cratere',
      'by-subject',
      ...images.map((_, i) => `image-${i}`),
      'projects-spacing',
      'by-commissioner',
      ...projects.map((_, i) => `project-${i}`),
    ]
    if (!isMobile) {
      base.push(
        'colors-spacing',
        'by-color',
        ...colors.map((c) => `color-${c}`),
        'randomly-spacing',
        'randomly',
        'empty-spacing',
        'empty'
      )
    }
    base.push('about-spacing', 'about')
    return base
  }, [images.length, projects.length, colors, isMobile])

  const rowIdToIndex = useMemo(() => {
    const m = new Map<string, number>()
    allRowIdsOrdered.forEach((id, i) => m.set(id, i))
    return m
  }, [allRowIdsOrdered])

  const isRowVisible = useCallback((rowId: string) => {
    const idx = rowIdToIndex.get(rowId)
    return idx !== undefined && idx < visibleRowCount
  }, [rowIdToIndex, visibleRowCount])

  useEffect(() => {
    visibleRowCountRef.current = visibleRowCount
    rowIdToIndexRef.current = rowIdToIndex
  }, [visibleRowCount, rowIdToIndex])

  const hasStartedAnimationRef = useRef(false)
  // Animation: white -> Cratere instantly -> 2s -> lines in quick succession (instantly each)
  useEffect(() => {
    if (images.length === 0 && projects.length === 0) return
    if (isSelectionMode) {
      setVisibleRowCount(allRowIdsOrdered.length)
      return () => {}
    }
    if (hasStartedAnimationRef.current) return () => {}
    hasStartedAnimationRef.current = true
    const total = allRowIdsOrdered.length
    const timeouts: NodeJS.Timeout[] = []
    // Show Cratere (index 0) instantly
    const t1 = setTimeout(() => setVisibleRowCount(1), 0)
    timeouts.push(t1)
    // 2 sec later: show remaining lines one by one, instantly each, quick succession (80ms between)
    const t2 = setTimeout(() => {
      let count = 1
      const showNext = () => {
        if (count >= total) return
        count++
        setVisibleRowCount(count)
        if (count < total) {
          const t = setTimeout(showNext, 80)
          timeouts.push(t)
        }
      }
      const t = setTimeout(showNext, 80)
      timeouts.push(t)
    }, 2000)
    timeouts.push(t2)
    return () => {
      hasStartedAnimationRef.current = false
      timeouts.forEach(clearTimeout)
    }
  }, [images.length, projects.length, colors.length, isSelectionMode, isMobile, allRowIdsOrdered])

  // Scroll handler for mobile - find which row is at top line of text
  useEffect(() => {
    if (!isMobile) return
    const handleScroll = () => {
      const lineEl = detectionLineRef.current
      const detectionLineY = lineEl
        ? lineEl.getBoundingClientRect().top + lineEl.getBoundingClientRect().height / 2
        : MOBILE_DETECTION_LINE
      let closestRow: { id: string; distance: number } | null = null
      const getMinDistance = () => (closestRow ? closestRow.distance : Infinity)
      const distToLine = (rect: DOMRect) => {
        const rowCenter = (rect.top + rect.bottom) / 2
        if (rect.top <= detectionLineY && rect.bottom >= detectionLineY) return 0
        return Math.abs(rowCenter - detectionLineY)
      }
      if (bySubjectRef.current) {
        const rect = bySubjectRef.current.getBoundingClientRect()
        const distance = distToLine(rect)
        if (distance < getMinDistance()) closestRow = { id: 'by-subject', distance }
      }
      images.forEach((_, index) => {
        const el = rowRefs.current.get(`image-${index}`)
        if (el) {
          const rect = el.getBoundingClientRect()
          const distance = distToLine(rect)
          if (distance < getMinDistance()) closestRow = { id: `image-${index}`, distance }
        }
      })
      if (byCommissionerRef.current) {
        const rect = byCommissionerRef.current.getBoundingClientRect()
        const distance = distToLine(rect)
        if (distance < getMinDistance()) {
          const firstWithImages = projects.findIndex(p => p?.images?.some(img => img?.asset))
          if (firstWithImages >= 0) closestRow = { id: `project-${firstWithImages}`, distance }
        }
      }
      projects.forEach((_, projectIndex) => {
        const el = rowRefs.current.get(`project-${projectIndex}`)
        if (el) {
          const rect = el.getBoundingClientRect()
          const distance = distToLine(rect)
          if (distance < getMinDistance()) closestRow = { id: `project-${projectIndex}`, distance }
        }
      })
      const aboutEl = rowRefs.current.get('about')
      if (aboutEl) {
        const rect = aboutEl.getBoundingClientRect()
        const distance = distToLine(rect)
        if (distance < getMinDistance()) closestRow = { id: 'about', distance }
      }
      if (closestRow) {
        if (closestRow.id.startsWith('image-')) {
          const index = parseInt(closestRow.id.replace('image-', ''))
          setCenteredImageIndex(images[index]?.index ?? null)
          setCenteredProjectIndex(null)
          setCenteredColor(null)
          setCenteredRandomly(false)
          randomlyImageIndexRef.current = null
        } else if (closestRow.id.startsWith('project-')) {
          const projectIndex = parseInt(closestRow.id.replace('project-', ''))
          const project = projects[projectIndex]
          if (project?.images?.some(img => img?.asset)) {
            setCenteredProjectIndex({ projectIndex, imageIndex: 0 })
            setCenteredImageIndex(null)
            setCenteredColor(null)
            setCenteredRandomly(false)
            randomlyImageIndexRef.current = null
          } else {
            setCenteredProjectIndex(null)
          }
        } else {
          setCenteredImageIndex(null)
          setCenteredProjectIndex(null)
          setCenteredColor(null)
          setCenteredRandomly(false)
          randomlyImageIndexRef.current = null
        }
      }
    }
    let rafId: number | null = null
    const throttledScroll = () => {
      if (rafId === null) rafId = requestAnimationFrame(() => { handleScroll(); rafId = null })
    }
    window.addEventListener('scroll', throttledScroll, { passive: true })
    window.addEventListener('resize', throttledScroll)
    handleScroll()
    return () => {
      window.removeEventListener('scroll', throttledScroll)
      window.removeEventListener('resize', throttledScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, images, projects, colors.length])

  const getRandomImageForColor = (colorKey: string): ImageItem | null => {
    const colorGroup = imagesByColor[colorKey]
    if (!colorGroup || colorGroup.images.length === 0) return null
    let pool = colorGroup.images
    if (is4VerticalLayout()) pool = pool.filter(img => !isImageHorizontal(img))
    else if (is4HorizontalLayout()) pool = pool.filter(img => isImageHorizontal(img))
    if (pool.length === 0) return null
    const randomIndex = Math.floor(Math.random() * pool.length)
    return pool[randomIndex]
  }

  const handleImageSelect = (image: ImageItem | null) => {
    if (!selectionContext) return
    
    console.log('Storing image:', {
      pageNumber: selectionContext.pageNumber,
      slotId: selectionContext.slotId,
      hasImage: !!image,
      imageAsset: image?.asset?._ref || image?.asset?._id || 'none'
    })
    
    setSelectedImage(selectionContext.pageNumber, selectionContext.slotId, image)
    setSelectionContext(null)
    
    // Navigate back to the designer - for right-side slots, go to the left page of the spread
    let targetPage = selectionContext.pageNumber
    if (selectionContext.slotId.startsWith('right-')) {
      // Right-side slots are on odd pages (3, 5, 7, etc.), go back to left page (2, 4, 6, etc.)
      targetPage = selectionContext.pageNumber - 1
    }
    router.push(`/designer?page=${targetPage}`)
  }

  const getSpreadLayout = (): LayoutType | null => {
    if (!selectionContext) return null
    const spreadPageNumber = selectionContext.pageNumber % 2 === 0 ? selectionContext.pageNumber : selectionContext.pageNumber - 1
    return getLayout(spreadPageNumber) as LayoutType
  }

  const is4VerticalLayout = (): boolean => getSpreadLayout() === '4-vertical'
  const is4HorizontalLayout = (): boolean => getSpreadLayout() === '4-horizontal'

  const isImageHorizontal = (image: ImageItem): boolean => {
    const dims = image.assetMetadata?.dimensions || image.asset?.metadata?.dimensions
    if (!dims?.width || !dims?.height) return false
    return dims.width > dims.height
  }

  const canSelectImage = (image: ImageItem): boolean => {
    if (!isSelectionMode) return true
    const layout = getSpreadLayout()
    if (layout === '4-vertical') return !isImageHorizontal(image)
    if (layout === '4-horizontal') return isImageHorizontal(image)
    return true
  }

  const handleImageClick = (image: ImageItem) => {
    if (isSelectionMode) {
      if (!canSelectImage(image)) return
      handleImageSelect(image)
    } else {
      // If not in selection mode, assign to cover and navigate to designer
      setSelectedImage(1, 'cover-1', image)
      router.push('/designer?page=1')
    }
  }

  const handleEmptyClick = () => {
    if (!selectionContext) return
    handleImageSelect(null)
  }

  const hoveredColorLabel = hoveredColor ? imagesByColor[hoveredColor]?.label ?? hoveredColor : null

  // About content lines
  const aboutLines = [
    { type: 'text' as const, content: 'Founded by Alessio Pinna, Felipe Menezes and Riccardo Alippi The crater is the circular cavity at the apex of a volcanic cone. The Crater (in Latin Crater, "cup") is one of the 88 modern constellations and represents the chalice from which Apollo drank the nectar of the Gods. Studio Cratere is a photography and creative studio. We want to see the world and give it meaning.', tight: false },
    { type: 'spacing' as const },
    { type: 'text' as const, content: 'Download portfolio', tight: false },
    { type: 'spacing' as const },
    { type: 'text' as const, content: 'Selected Pubblications', tight: true },
    { type: 'text' as const, content: 'Arxipelag - Sul Sentiero', tight: true },
    { type: 'text' as const, content: 'Phroom, Zone Magazine - Teleonomia', tight: true },
    { type: 'text' as const, content: 'Perimetro - La Cattedrale', tight: true },
    { type: 'text' as const, content: 'C41 - Boring Cactus', tight: true },
    { type: 'text' as const, content: 'Highsnobiety, Nss sport, Hypebeast - Nike ACG Train', tight: true },
    { type: 'spacing' as const },
    { type: 'text' as const, content: 'Selected Exhibitions', tight: true },
    { type: 'text' as const, content: '@Daste Bergamo, "One Eye Sees, The Other Feels", 30/04/2022 - 14/05/2022', tight: true },
    { type: 'text' as const, content: '@Studio Cratere, "Everything Be Revealed In Time", 05/04/2024 - 03/05/2024', tight: true },
    { type: 'text' as const, content: '@Studio Cratere, "Lucid Dreams", 13/06/2024 - 12/07/2024', tight: true },
    { type: 'text' as const, content: '@Studio Cratere, "by PHONE", 23/10/2024 - review on Phroom and Outpump', tight: true },
    { type: 'spacing' as const },
    { type: 'text' as const, content: 'Commissions', tight: true },
    { type: 'text' as const, content: 'Represented by C41.eu', tight: true },
    { type: 'spacing' as const },
    { type: 'text' as const, content: 'studio@cratere.studio', tight: true },
    { type: 'text' as const, content: 'M: +39 3208740367', tight: true },
    { type: 'spacing' as const },
    { type: 'text' as const, content: 'General Info', tight: true },
    { type: 'text' as const, content: 'contact@cratere.studio', tight: true },
    { type: 'spacing' as const },
    { type: 'text' as const, content: 'Address', tight: true },
    { type: 'text' as const, content: 'Viale Abruzzi 32', tight: true },
    { type: 'spacing' as const },
    { type: 'text' as const, content: 'Website', tight: true },
    { type: 'text' as const, content: 'Matteo Viti', tight: true },
  ]

  const showImagePreview = isMobile ? centeredImageIndex !== null : hoveredIndex !== null
  const showProjectPreview = isMobile
    ? centeredProjectIndex !== null
    : (hoveredProjectIndex !== null && hoveredProjectImageIndex !== null)
  const showColorPreview = isMobile ? centeredColor : hoveredColor
  const showRandomlyPreview = isMobile ? centeredRandomly : hoveredRandomly
  const centeredColorLabel = centeredColor ? imagesByColor[centeredColor]?.label ?? centeredColor : null

  return (
    <>
      {isMobile && (
        <>
          <div ref={detectionLineRef} className="mobile-detection-area-debug" aria-hidden="true" />
          <div className="mobile-line-dashes" aria-hidden="true">
            <span className="mobile-line-dash mobile-line-dash-left">—</span>
            <span className="mobile-line-dash mobile-line-dash-right">—</span>
          </div>
        </>
      )}
      <div ref={imageColumnRef} className={`image-column ${isReady ? 'column-ready' : ''}`}>
        <div className={`header-title ${isRowVisible('cratere') ? 'row-visible' : 'row-hidden'}`} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', width: '100%' }}>
          <span>Cratere</span>
          {isSelectionMode && selectionContext && (
            <span style={{ fontSize: '14px', fontWeight: 'normal', marginLeft: '20px' }}>
              {selectionContext.pageNumber === 1 
                ? 'Select an image for the cover'
                : `Select an image for page ${selectionContext.pageNumber}`}
            </span>
          )}
        </div>
        <div
          ref={bySubjectRef}
          className={`header-subtitle ${isRowVisible('by-subject') ? 'row-visible' : 'row-hidden'}`}
        >
          By Subject
        </div>
        {images.map((image, index) => {
          const title = image.title || extractTitleFromFilename(image.asset, image.assetMetadata)
          const disabled = isSelectionMode && !canSelectImage(image)
          
          return (
            <div
              key={image.index}
              ref={(el) => { if (el) rowRefs.current.set(`image-${index}`, el) }}
              className={`image-row ${isRowVisible(`image-${index}`) ? 'row-visible' : 'row-hidden'}`}
              data-image-index={index}
              onMouseEnter={() => {
                if (!isMobile && !disabled && isRowVisible(`image-${index}`)) setHoveredIndex(image.index)
              }}
              onMouseLeave={() => !isMobile && setHoveredIndex(null)}
              onClick={() => !isMobile && handleImageClick(image)}
              style={{ 
                cursor: isMobile ? 'default' : (disabled ? 'default' : 'pointer'),
                opacity: disabled ? 0.4 : 1,
              }}
            >
              <span className="image-number">{image.index}</span>
              <span className="image-title">{title}</span>
              <span className="image-year">{image.year}</span>
            </div>
          )
        })}
        
        <div className={`projects-spacing ${isRowVisible('projects-spacing') ? 'row-visible' : 'row-hidden'}`}></div>
        <div
          ref={byCommissionerRef}
          className={`header-subtitle ${isRowVisible('by-commissioner') ? 'row-visible' : 'row-hidden'}`}
        >
          By Commisioner
        </div>
        
        {projects.map((project, projectIndex) => {
          const validImages = project.images?.filter(img => img?.asset) || []
          const imageCount = validImages.length
          const projectNumber = projectIndex + 1
          
          return (
            <div
              key={projectIndex}
              ref={(el) => { if (el) rowRefs.current.set(`project-${projectIndex}`, el) }}
              className={`project-row ${isRowVisible(`project-${projectIndex}`) ? 'row-visible' : 'row-hidden'}`}
              onMouseLeave={() => {
                if (!isMobile) {
                  setHoveredProjectIndex(null)
                  setHoveredProjectImageIndex(null)
                }
              }}
            >
              <div className="project-content">
                <div className="project-line-1">
                  <span className="project-number">{projectNumber}</span>
                  <span className="project-title">{project.title}</span>
                  <span className="project-year">{project.year}</span>
                </div>
                <div className="project-line-2">
                  <span className="project-client">{project.client}</span>
                </div>
              </div>
              {imageCount > 0 && !isMobile && (
                <div className="project-image-sections">
                  {validImages.map((image, imgIndex) => {
                    const imageItem: ImageItem | null = image.asset ? {
                      asset: image.asset,
                      title: image.title,
                      color: image.color,
                      year: project.year,
                      index: images.length + projectIndex * 1000 + imgIndex,
                      assetMetadata: image.assetMetadata,
                    } : null
                    const disabled = imageItem && isSelectionMode && !canSelectImage(imageItem)
                    
                    return (
                      <div
                        key={imgIndex}
                        className="project-image-section"
                        style={{ 
                          width: `${100 / imageCount}%`, 
                          cursor: disabled ? 'default' : 'pointer',
                          opacity: disabled ? 0.4 : 1,
                        }}
                        data-project-index={projectIndex}
                        data-project-image-index={imgIndex}
                        onMouseEnter={() => {
                          if (!disabled && isRowVisible(`project-${projectIndex}`)) {
                            setHoveredProjectIndex(projectIndex)
                            setHoveredProjectImageIndex(imgIndex)
                          }
                        }}
                        onClick={() => {
                          if (imageItem && !disabled) {
                            if (isSelectionMode) {
                              handleImageSelect(imageItem)
                            } else {
                              handleImageClick(imageItem)
                            }
                          }
                        }}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        
        {!isMobile && (
          <>
            <div className={`colors-spacing ${isRowVisible('colors-spacing') ? 'row-visible' : 'row-hidden'}`}></div>
            <div className={`header-subtitle ${isRowVisible('by-color') ? 'row-visible' : 'row-hidden'}`}>By Color</div>
            {colors.map((colorKey) => {
              const colorGroup = imagesByColor[colorKey]
              const formattedColor = colorGroup?.label ?? colorKey
              const hasNoVerticalImages = is4VerticalLayout() && colorGroup && !colorGroup.images.some(img => !isImageHorizontal(img))
              const hasNoHorizontalImages = is4HorizontalLayout() && colorGroup && !colorGroup.images.some(img => isImageHorizontal(img))
              const colorDisabled = (hoveredColor === colorKey && hoveredColorImage && isSelectionMode && !canSelectImage(hoveredColorImage)) || hasNoVerticalImages || hasNoHorizontalImages
              return (
                <div
                  key={colorKey}
                  ref={(el) => { if (el) rowRefs.current.set(`color-${colorKey}`, el) }}
                  className={`color-row ${isRowVisible(`color-${colorKey}`) ? 'row-visible' : 'row-hidden'}`}
                  data-color-key={colorKey}
                  onMouseEnter={() => {
                    if (isRowVisible(`color-${colorKey}`)) {
                      const randomImage = getRandomImageForColor(colorKey)
                      setHoveredColor(colorKey)
                      setHoveredColorImage(randomImage)
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredColor(null)
                    setHoveredColorImage(null)
                  }}
                  onClick={() => {
                    if (hasNoVerticalImages || hasNoHorizontalImages) return
                    const imageToUse = hoveredColorImage
                    if (imageToUse && (!isSelectionMode || canSelectImage(imageToUse))) {
                      if (isSelectionMode) {
                        handleImageSelect(imageToUse)
                      } else {
                        handleImageClick(imageToUse)
                      }
                    }
                  }}
                  style={{ 
                    cursor: 'pointer',
                    opacity: colorDisabled ? 0.4 : 1,
                  }}
                >
                  <span className="color-name">{formattedColor}</span>
                </div>
              )
            })}
            <div className={`randomly-spacing ${isRowVisible('randomly-spacing') ? 'row-visible' : 'row-hidden'}`}></div>
            <div
              ref={(el) => { if (el) rowRefs.current.set('randomly', el) }}
              className={`randomly-row ${isRowVisible('randomly') ? 'row-visible' : 'row-hidden'}`}
              onMouseEnter={() => {
                {
                  const validImages = images.filter(img => img?.asset)
                  let pool = validImages
                  if (is4VerticalLayout()) pool = pool.filter(img => !isImageHorizontal(img))
                  else if (is4HorizontalLayout()) pool = pool.filter(img => isImageHorizontal(img))
                  if (pool.length > 0) {
                    const selectedImage = pool[Math.floor(Math.random() * pool.length)]
                    const indexInOriginal = validImages.indexOf(selectedImage)
                    setRandomImageIndex(indexInOriginal)
                    setHoveredRandomly(true)
                  } else {
                    setHoveredRandomly(false)
                    setRandomImageIndex(null)
                  }
                }
              }}
              onMouseLeave={() => {
                setHoveredRandomly(false)
                setRandomImageIndex(null)
              }}
              onClick={() => {
                if (isSelectionMode) {
                  const validImages = images.filter(img => img?.asset)
                  if (is4VerticalLayout() && validImages.filter(img => !isImageHorizontal(img)).length === 0) return
                  if (is4HorizontalLayout() && validImages.filter(img => isImageHorizontal(img)).length === 0) return
                }
                if (randomImageIndex !== null) {
                  const validImages = images.filter(img => img?.asset)
                  const imageToUse = validImages[randomImageIndex]
                  if (imageToUse && (!isSelectionMode || canSelectImage(imageToUse))) {
                    if (isSelectionMode) {
                      handleImageSelect(imageToUse)
                    } else {
                      handleImageClick(imageToUse)
                    }
                  }
                }
              }}
              style={{ 
                cursor: 'pointer',
                opacity: (() => {
                  if (isSelectionMode) {
                    const validImages = images.filter(img => img?.asset)
                    if (is4VerticalLayout() && validImages.filter(img => !isImageHorizontal(img)).length === 0) return 0.4
                    if (is4HorizontalLayout() && validImages.filter(img => isImageHorizontal(img)).length === 0) return 0.4
                  }
                  return 1
                })(),
              }}
            >
              <span className="randomly-text">Randomly</span>
            </div>
          </>
        )}
        
        {!isMobile && (
          <>
            <div className={`empty-spacing ${isRowVisible('empty-spacing') ? 'row-visible' : 'row-hidden'}`}></div>
            <div 
              ref={(el) => { if (el) rowRefs.current.set('empty', el) }}
              className={`empty-row ${isRowVisible('empty') ? 'row-visible' : 'row-hidden'}`}
              onClick={handleEmptyClick}
              style={{ cursor: isSelectionMode ? 'pointer' : 'default' }}
            >
              <span className="empty-text">Empty</span>
            </div>
          </>
        )}
        
        <div className={`about-spacing ${isRowVisible('about-spacing') ? 'row-visible' : 'row-hidden'}`}></div>
        <div 
          ref={(el) => { if (el) rowRefs.current.set('about', el) }}
          className={`about-row ${isRowVisible('about') ? 'row-visible' : 'row-hidden'}`}
        >
          <button
            className="about-toggle"
            onClick={() => !isMobile && setExpandedAbout(!expandedAbout)}
          >
            {(expandedAbout || isMobile) ? (
              <div className="about-content">
                {aboutLines.map((line, idx) => {
                  if (line.type === 'spacing') {
                    return <div key={idx} className="about-line-spacing" />
                  }
                  return (
                    <div key={idx} className={`about-line ${line.tight ? 'about-line-tight' : ''}`}>
                      {line.content}
                    </div>
                  )
                })}
              </div>
            ) : (
              <span>+</span>
            )}
          </button>
        </div>
      </div>
      
      {showImagePreview && (() => {
        const imageIndex = isMobile ? centeredImageIndex : hoveredIndex
        if (!imageIndex) return null
        const image = images[imageIndex - 1]
        if (!image?.asset) return null
        return (
          <div className="image-preview-overlay">
            <img
              src={urlFor(image.asset).width(2000).url()}
              alt={image.title || extractTitleFromFilename(image.asset, image.assetMetadata) || `Image ${imageIndex}`}
              className="image-preview"
            />
          </div>
        )
      })()}
      
      {isMobile && centeredProjectIndex !== null && (() => {
        const project = projects[centeredProjectIndex.projectIndex]
        if (!project) return null
        const validImages = project.images?.filter(img => img?.asset) || []
        if (validImages.length === 0) return null
        return (
          <div key={`project-slider-${centeredProjectIndex.projectIndex}`} className="project-slider-overlay">
            <div className="project-slider-scroll">
              <div className="project-slider-inner">
                {validImages.map((image, imgIndex) => (
                  <div key={imgIndex} className="project-slider-item">
                    <img
                      src={urlFor(image.asset).width(2000).url()}
                      alt={project.title || `Project ${centeredProjectIndex.projectIndex + 1} Image ${imgIndex + 1}`}
                      className="project-slider-image"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}
      
      {!isMobile && showProjectPreview && (() => {
         const project = projects[hoveredProjectIndex!]
         if (!project) return null
         const validImages = project.images?.filter(img => img?.asset) || []
         const image = validImages[hoveredProjectImageIndex!]
         if (!image?.asset) return null
         return (
           <div className="image-preview-overlay">
             <img
               src={urlFor(image.asset).width(2000).url()}
               alt={project.title || `Project ${hoveredProjectIndex! + 1} Image ${hoveredProjectImageIndex! + 1}`}
               className="image-preview"
             />
           </div>
         )
       })()}
      
      {showColorPreview && (() => {
        const colorKey = isMobile ? centeredColor! : hoveredColor!
        const colorLabel = isMobile ? centeredColorLabel : hoveredColorLabel
        const randomImage = !isMobile && hoveredColorImage ? hoveredColorImage : getRandomImageForColor(colorKey)
        if (!randomImage?.asset) return null
        if (is4VerticalLayout() && isImageHorizontal(randomImage)) return null
        if (is4HorizontalLayout() && !isImageHorizontal(randomImage)) return null
        return (
          <div className="image-preview-overlay">
            <img
              src={urlFor(randomImage.asset).width(2000).url()}
              alt={
                randomImage.title ||
                extractTitleFromFilename(randomImage.asset, randomImage.assetMetadata) ||
                (colorLabel ? `Color ${colorLabel}` : 'Color preview')
              }
              className="image-preview"
            />
          </div>
        )
      })()}
      
      {showRandomlyPreview && randomImageIndex !== null && (() => {
        const validImages = images.filter(img => img?.asset)
        if (validImages.length === 0 || randomImageIndex >= validImages.length) return null
        const randomImage = validImages[randomImageIndex]
        if (!randomImage?.asset) return null
        if (is4VerticalLayout() && isImageHorizontal(randomImage)) return null
        if (is4HorizontalLayout() && !isImageHorizontal(randomImage)) return null
        return (
          <div className="image-preview-overlay">
            <img
              src={urlFor(randomImage.asset).width(2000).url()}
              alt={randomImage.title || extractTitleFromFilename(randomImage.asset, randomImage.assetMetadata) || 'Random Image'}
              className="image-preview"
            />
          </div>
        )
      })()}
      
      <style jsx>{`
        .image-column {
          width: 30vw;
          margin: 150px auto 0;
          position: relative;
          z-index: 10;
        }
        
        @media (max-width: 768px) {
          .image-column {
            width: calc(100% - 40px);
            margin-left: 20px;
            margin-right: 20px;
            margin-top: 0;
            padding-top: 14px;
            position: relative;
            z-index: 10;
          }
        }
        
        .row-hidden {
          opacity: 0;
          visibility: hidden;
        }
        
        .row-visible {
          opacity: 1;
          visibility: visible;
        }
        
        .header-subtitle.row-hidden,
        .header-title.row-hidden {
          opacity: 0 !important;
          visibility: hidden !important;
        }
        
        .header-title {
          text-align: left;
          line-height: 130%;
          margin-bottom: calc(1em * 1.3 * 3);
          position: relative;
          z-index: 10;
        }
        
        .header-subtitle {
          text-align: left;
          line-height: 130%;
          margin-bottom: calc(1em * 1.3);
          position: relative;
          z-index: 10;
        }
        
        .image-row {
          display: flex;
          align-items: baseline;
          padding: 0;
          margin: 0;
          position: relative;
          cursor: pointer;
          line-height: 130%;
          min-height: 1.3em;
          z-index: 10;
        }
        
        .image-number {
          text-align: left;
          position: absolute;
          left: 0;
          z-index: 10;
        }
        
        .image-title {
          position: absolute;
          left: 30px;
          text-align: left;
          z-index: 10;
        }
        
        .image-year {
          text-align: right;
          margin-left: auto;
          position: absolute;
          right: 0;
          z-index: 10;
        }
        
        .projects-spacing {
          margin-top: calc(1em * 1.3 * 3);
        }
        
        .colors-spacing {
          margin-top: calc(1em * 1.3 * 3);
        }
        
        .color-row {
          position: relative;
          cursor: pointer;
          line-height: 130%;
          min-height: 1.3em;
          z-index: 10;
        }
        
        .color-name {
          text-align: left;
          position: absolute;
          left: 0;
        }
        
        .randomly-spacing {
          margin-top: calc(1em * 1.3 * 3);
        }
        
        .randomly-row {
          position: relative;
          cursor: pointer;
          line-height: 130%;
          min-height: 1.3em;
          z-index: 10;
        }
        
        .randomly-text {
          text-align: left;
          position: absolute;
          left: 0;
        }
        
        .empty-spacing {
          margin-top: calc(1em * 1.3 * 3);
        }
        
        .empty-row {
          position: relative;
          line-height: 130%;
          min-height: 1.3em;
          z-index: 10;
        }
        
        .empty-text {
          text-align: left;
          position: absolute;
          left: 0;
        }
        
        .about-spacing {
          margin-top: calc(1em * 1.3 * 3);
        }
        
        .about-row {
          position: relative;
          z-index: 10;
          margin-bottom: 150px;
        }
        
        .about-toggle {
          background: none;
          border: none;
          padding: 0;
          margin: 0;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          font-size: inherit;
          color: inherit;
          line-height: 130%;
          width: 100%;
        }
        
        .about-content {
          text-align: left;
        }
        
        .about-line {
          line-height: 130%;
          margin-bottom: calc(1em * 1.3);
        }
        
        .about-line-tight {
          margin-bottom: 0;
        }
        
        .about-line-spacing {
          margin-top: calc(1em * 1.3);
        }
        
        .project-row {
          position: relative;
          cursor: pointer;
          margin-bottom: 3px;
          min-height: calc(1.3em * 2);
        }
        
        .project-content {
          position: relative;
          z-index: 10;
          pointer-events: none;
        }
        
        .project-line-1 {
          display: flex;
          align-items: baseline;
          position: relative;
          line-height: 130%;
          min-height: 1.3em;
        }
        
        .project-line-2 {
          position: relative;
          line-height: 130%;
          min-height: 1.3em;
        }
        
        .project-number {
          text-align: left;
          position: absolute;
          left: 0;
          z-index: 10;
          pointer-events: none;
        }
        
        .project-title {
          position: absolute;
          left: 30px;
          text-align: left;
          z-index: 10;
          pointer-events: none;
        }
        
        .project-year {
          text-align: right;
          position: absolute;
          right: 0;
          z-index: 10;
          pointer-events: none;
        }
        
        .project-client {
          position: absolute;
          left: 30px;
          text-align: left;
          font-style: italic;
          z-index: 10;
          pointer-events: none;
        }
        
        .project-image-sections {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          z-index: 5;
          pointer-events: auto;
        }
        
        .project-image-section {
          height: 100%;
          cursor: pointer;
          pointer-events: auto;
        }
        
        .image-preview-overlay {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1;
          pointer-events: none;
        }
        
        .image-preview {
          max-width: 60vw;
          max-height: 80vh;
          width: auto;
          height: auto;
          object-fit: contain;
        }
        
        @media (max-width: 768px) {
          .image-preview {
            max-width: 80vw;
          }
        }
        
        @media (max-width: 768px) {
          .mobile-detection-area-debug {
            position: fixed;
            top: 21px;
            left: 0;
            right: 0;
            height: 4px;
            pointer-events: none;
            z-index: 19;
          }
          .mobile-line-dashes {
            position: fixed;
            top: 23px;
            left: 0;
            right: 0;
            pointer-events: none;
            z-index: 20;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            transform: translateY(-50%);
          }
          .mobile-line-dash {
            font-size: 14px;
            line-height: 1;
            color: #000;
          }
          .mobile-line-dash-left {
            margin-left: -24px;
          }
          .mobile-line-dash-right {
            margin-right: -24px;
          }
        }
        
        @media (max-width: 768px) {
          .project-slider-overlay {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 11;
            pointer-events: auto;
            width: 100vw;
            min-height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: visible;
            mix-blend-mode: multiply;
          }
          
          .project-slider-scroll {
            overflow-x: auto;
            overflow-y: visible;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-x: none;
            scrollbar-width: none;
            -ms-overflow-style: none;
            touch-action: pan-x pan-y;
            width: 100vw;
            max-height: 80vh;
          }
          
          .project-slider-scroll::-webkit-scrollbar {
            display: none;
          }
          
          .project-slider-inner {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 5vw;
            flex-wrap: nowrap;
            width: max-content;
            padding-left: 10vw;
            padding-right: 10vw;
          }
          
          .project-slider-item {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 80vw;
            min-width: 80vw;
          }
          
          .project-slider-image {
            width: 80vw;
            max-height: 80vh;
            height: auto;
            object-fit: contain;
            display: block;
          }
        }
      `}</style>
    </>
  )
}



