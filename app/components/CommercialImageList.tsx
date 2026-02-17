'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { urlFor } from '../../lib/imageUrl'
import type { AboutLine } from '../../lib/siteSettings'

// Mobile: vertical position (px from viewport top) - fallback when ref unavailable
const MOBILE_DETECTION_LINE = 23

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
  pdf?: {
    asset?: {
      _id?: string
      url?: string
      originalFilename?: string
    }
  }
  images: Array<{
    asset: any
    assetMetadata?: any
    title?: string
    color?: string
  }>
}

interface CommercialImageListProps {
  images: ImageItem[]
  projects: Project[]
  aboutLines: AboutLine[]
}

export default function CommercialImageList({ images, projects, aboutLines }: CommercialImageListProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [hoveredProjectIndex, setHoveredProjectIndex] = useState<number | null>(null)
  const [hoveredProjectImageIndex, setHoveredProjectImageIndex] = useState<number | null>(null)
  const [hoveredColor, setHoveredColor] = useState<string | null>(null)
  const [hoveredRandomly, setHoveredRandomly] = useState<boolean>(false)
  const [randomImageIndex, setRandomImageIndex] = useState<number | null>(null)
  const [visibleRows, setVisibleRows] = useState<Set<string>>(new Set())
  const [isReady, setIsReady] = useState<boolean>(false)
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [centeredImageIndex, setCenteredImageIndex] = useState<number | null>(null)
  const [centeredProjectIndex, setCenteredProjectIndex] = useState<{ projectIndex: number; imageIndex: number } | null>(null)
  const [centeredColor, setCenteredColor] = useState<string | null>(null)
  const [centeredRandomly, setCenteredRandomly] = useState<boolean>(false)
  
  // Refs for tracking row positions
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map())
  const bySubjectRef = useRef<HTMLDivElement>(null)
  const byCommissionerRef = useRef<HTMLDivElement>(null)
  const mousePosRef = useRef<{ x: number; y: number } | null>(null)
  const imageColumnRef = useRef<HTMLDivElement | null>(null)
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
      return
    }
    const imageRow = el.closest('.image-row') as HTMLElement | null
    if (imageRow) {
      const idx = imageRow.getAttribute('data-image-index')
      if (idx !== null && visibleRows.has(`image-${idx}`)) {
        const index = parseInt(idx, 10)
        setHoveredIndex(images[index]?.index ?? null)
        setHoveredProjectIndex(null)
        setHoveredProjectImageIndex(null)
        return
      }
    }
    const projectSection = el.closest('.project-image-section') as HTMLElement | null
    if (projectSection) {
      const pIdx = projectSection.getAttribute('data-project-index')
      const imgIdx = projectSection.getAttribute('data-project-image-index')
      if (pIdx !== null && imgIdx !== null && visibleRows.has(`project-${pIdx}`)) {
        setHoveredIndex(null)
        setHoveredProjectIndex(parseInt(pIdx, 10))
        setHoveredProjectImageIndex(parseInt(imgIdx, 10))
        return
      }
    }
    setHoveredIndex(null)
    setHoveredProjectIndex(null)
    setHoveredProjectImageIndex(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, visibleRows, isMobile])

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

  const normalizeColorKey = (color: string): string =>
    color
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

  const getColorLabel = (rawColor: string): string => rawColor.trim()

  // Group images by color (prefer explicit color field, fallback to filename) - needed for scroll handler
  const imagesByColor = images.reduce((acc, image) => {
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
  }, {} as Record<string, { label: string; images: ImageItem[] }>)

  const colors = Object.keys(imagesByColor).sort((a, b) => {
    const labelA = imagesByColor[a]?.label?.toLowerCase() ?? ''
    const labelB = imagesByColor[b]?.label?.toLowerCase() ?? ''
    return labelA.localeCompare(labelB)
  })

  useEffect(() => {
    // Mark as ready after a tiny delay to ensure styles are applied
    const timer = setTimeout(() => {
      setIsReady(true)
    }, 0)
    
    // Detect mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

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
  
  // Scroll handler for mobile - find which row is at top line (matches homepage)
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
      // Update state based on closest row
      if (closestRow) {
        if (closestRow.id.startsWith('image-')) {
          const index = parseInt(closestRow.id.replace('image-', ''))
          setCenteredImageIndex(images[index]?.index || null)
          setCenteredProjectIndex(null)
        } else if (closestRow.id.startsWith('project-')) {
          const projectIndex = parseInt(closestRow.id.replace('project-', ''))
          const project = projects[projectIndex]
          if (project?.images?.some(img => img?.asset)) {
            setCenteredProjectIndex({ projectIndex, imageIndex: 0 })
            setCenteredImageIndex(null)
          } else {
            setCenteredProjectIndex(null)
          }
        } else {
          setCenteredImageIndex(null)
          setCenteredProjectIndex(null)
        }
      }
    }
    
    // Use requestAnimationFrame for smooth updates
    let rafId: number | null = null
    const throttledScroll = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          handleScroll()
          rafId = null
        })
      }
    }
    
    window.addEventListener('scroll', throttledScroll, { passive: true })
    window.addEventListener('resize', throttledScroll)
    handleScroll() // Initial check
    
    return () => {
      window.removeEventListener('scroll', throttledScroll)
      window.removeEventListener('resize', throttledScroll)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, images, projects])

  const getRandomImageForColor = (colorKey: string): ImageItem | null => {
    const colorGroup = imagesByColor[colorKey]
    if (!colorGroup || colorGroup.images.length === 0) return null
    const randomIndex = Math.floor(Math.random() * colorGroup.images.length)
    return colorGroup.images[randomIndex]
  }

  const getPdfUrl = (pdf: Project['pdf']): string | null => {
    if (!pdf?.asset) return null
    
    // If URL is directly available
    if (pdf.asset.url) {
      return pdf.asset.url
    }
    
    // Otherwise construct URL from asset ID
    const assetId = pdf.asset._id
    if (!assetId) return null
    
    // Sanity file URL format: https://cdn.sanity.io/files/{projectId}/{dataset}/{assetId}.pdf
    // Remove the 'file-' prefix if present
    const cleanAssetId = assetId.replace(/^file-/, '')
    return `https://cdn.sanity.io/files/jeo4p1su/production/${cleanAssetId}.pdf`
  }

  const handleProjectClick = (project: Project) => {
    const pdfUrl = getPdfUrl(project.pdf)
    if (pdfUrl) {
      // Open PDF in a new tab/window
      window.open(pdfUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const hoveredColorLabel = hoveredColor ? imagesByColor[hoveredColor]?.label ?? hoveredColor : null
  const centeredColorLabel = centeredColor ? imagesByColor[centeredColor]?.label ?? centeredColor : null

  // Animation: Show rows sequentially
  useEffect(() => {
    // Wait for content to load (check if we have data)
    if (images.length === 0 && projects.length === 0) return
    
    // Normal animation for first load
    let timer2: NodeJS.Timeout | null = null
    
    // Show "Cratere" first
    const timer1 = setTimeout(() => {
      setVisibleRows(new Set(['cratere']))
      
      // Wait 2 seconds, then show remaining rows with 100ms delay each
      timer2 = setTimeout(() => {
        const allRowIds = [
          'by-subject',
          ...images.map((_, i) => `image-${i}`),
          'projects-spacing',
          'by-commissioner',
          ...projects.map((_, i) => `project-${i}`),
          'about-spacing',
          'about',
        ]
        
        allRowIds.forEach((rowId, index) => {
          setTimeout(() => {
            setVisibleRows(prev => new Set([...prev, rowId]))
          }, index * 100)
        })
      }, 2000)
    }, 100) // Small delay to ensure content is loaded
    
    return () => {
      clearTimeout(timer1)
      if (timer2) clearTimeout(timer2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length, projects.length])

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
        <div className={`header-title ${visibleRows.has('cratere') ? 'row-visible' : 'row-hidden'}`} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', width: '100%' }}>
          <span>Cratere</span>
        </div>
        <div 
          ref={bySubjectRef}
          className={`header-subtitle ${visibleRows.has('by-subject') ? 'row-visible' : 'row-hidden'}`}
          data-row-id="by-subject"
        >
          By Subject
        </div>
        {images.map((image, index) => {
          const title = image.title || extractTitleFromFilename(image.asset, image.assetMetadata)
          
          return (
            <div
              key={image.index}
              ref={(el) => {
                if (el) rowRefs.current.set(`image-${index}`, el)
              }}
              className={`image-row ${visibleRows.has(`image-${index}`) ? 'row-visible' : 'row-hidden'}`}
              data-row-id={`image-${index}`}
              data-image-index={index}
              onMouseEnter={() => !isMobile && setHoveredIndex(image.index)}
              onMouseLeave={() => !isMobile && setHoveredIndex(null)}
            >
              <span className="image-number">{image.index}</span>
              <span className="image-title">{title}</span>
              <span className="image-year">{image.year}</span>
            </div>
          )
        })}
        
        <div className={`projects-spacing ${visibleRows.has('projects-spacing') ? 'row-visible' : 'row-hidden'}`}></div>
        <div
          ref={byCommissionerRef}
          className={`header-subtitle ${visibleRows.has('by-commissioner') ? 'row-visible' : 'row-hidden'}`}
        >
          By Commisioner
        </div>
        
        {projects.map((project, projectIndex) => {
          const validImages = project.images?.filter(img => img?.asset) || []
          const imageCount = validImages.length
          const projectNumber = projectIndex + 1
          const hasPdf = !!project.pdf?.asset
          
          return (
            <div
              key={projectIndex}
              ref={(el) => {
                if (el) rowRefs.current.set(`project-${projectIndex}`, el)
              }}
              className={`project-row ${visibleRows.has(`project-${projectIndex}`) ? 'row-visible' : 'row-hidden'}`}
              data-row-id={`project-${projectIndex}`}
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
              {imageCount > 0 && (
                <div className="project-image-sections">
                  {validImages.map((image, imgIndex) => {
                    return (
                      <div
                        key={imgIndex}
                        className="project-image-section"
                        style={{ width: `${100 / imageCount}%`, cursor: hasPdf ? 'pointer' : 'default' }}
                        data-project-index={projectIndex}
                        data-project-image-index={imgIndex}
                        onMouseEnter={() => {
                          if (!isMobile) {
                            setHoveredProjectIndex(projectIndex)
                            setHoveredProjectImageIndex(imgIndex)
                          }
                        }}
                        onClick={() => {
                          if (hasPdf) {
                            handleProjectClick(project)
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
        
        <div className={`about-spacing ${visibleRows.has('about-spacing') ? 'row-visible' : 'row-hidden'}`}></div>
        <div
          ref={(el) => { if (el) rowRefs.current.set('about', el) }}
          className={`about-row ${visibleRows.has('about') ? 'row-visible' : 'row-hidden'}`}
        >
          <div className="about-content">
            {aboutLines.map((line, idx) => {
              if (line.type === 'spacing') {
                return <div key={idx} className="about-line-spacing" />
              }
              const lineClass = `about-line ${line.tight ? 'about-line-tight' : ''}`
              if (line.type === 'link') {
                const isInternal = line.url.startsWith('/')
                const isPdf = !isInternal && line.url.toLowerCase().includes('.pdf')
                const href = isPdf ? `${line.url}?dl` : line.url
                return (
                  <div key={idx} className={lineClass}>
                    <a
                      href={href}
                      {...(isInternal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                      className="about-link"
                    >
                      {line.content}
                    </a>
                  </div>
                )
              }
              if (line.type === 'email') {
                return (
                  <div key={idx} className={lineClass}>
                    <a href={`mailto:${line.content}`} className="about-link">
                      {line.content}
                    </a>
                  </div>
                )
              }
              if (line.type === 'phone') {
                return (
                  <div key={idx} className={lineClass}>
                    <a href={`tel:${line.content.replace(/^M:\s*/i, '').replace(/\s/g, '')}`} className="about-link">
                      {line.content}
                    </a>
                  </div>
                )
              }
              if (line.type === 'publication') {
                const outletParts = line.outlets.map((o, i) =>
                  o.url ? (
                    <span key={i}>
                      {i > 0 && ', '}
                      <a href={o.url} target="_blank" rel="noopener noreferrer" className="about-link">{o.title}</a>
                    </span>
                  ) : (
                    <span key={i}>{i > 0 ? ', ' : ''}{o.title}</span>
                  )
                )
                return (
                  <div key={idx} className={lineClass}>
                    {outletParts}
                    {line.projectTitle && ` - ${line.projectTitle}`}
                  </div>
                )
              }
              if (line.type === 'exhibition') {
                const hasReviewLinks = line.reviewLinks.length > 0
                return (
                  <div key={idx} className={lineClass}>
                    {line.title}
                    {hasReviewLinks && (
                      <> - Review on {line.reviewLinks.map((r, i) =>
                        r.url ? (
                          <span key={i}>
                            {i > 0 && ', '}
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="about-link">{r.title}</a>
                          </span>
                        ) : (
                          <span key={i}>{i > 0 ? ', ' : ''}{r.title}</span>
                        )
                      )}</>
                    )}
                  </div>
                )
              }
              return (
                <div key={idx} className={lineClass}>
                  {line.content}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      {(isMobile ? centeredImageIndex !== null : hoveredIndex !== null) && (() => {
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
      
      {/* Desktop: Show single image on hover */}
      {!isMobile && hoveredProjectIndex !== null && hoveredProjectImageIndex !== null && (() => {
        const project = projects[hoveredProjectIndex]
        if (!project) return null
        const validImages = project.images?.filter(img => img?.asset) || []
        const image = validImages[hoveredProjectImageIndex]
        if (!image?.asset) return null
        return (
          <div className="image-preview-overlay">
            <img
              src={urlFor(image.asset).width(2000).url()}
              alt={project.title || `Project ${hoveredProjectIndex + 1} Image ${hoveredProjectImageIndex + 1}`}
              className="image-preview"
            />
          </div>
        )
      })()}
      
      {/* Mobile: Show project slider in center (same as homepage) */}
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
        }
        
        .row-visible {
          opacity: 1;
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
          line-height: 130%;
          min-height: 1.3em;
          z-index: 10;
        }
        
        .randomly-text {
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
        
        .about-link {
          color: inherit;
          text-decoration: none;
        }
        .about-link:hover {
          text-decoration: underline;
        }
        
        .about-line-spacing {
          margin-top: calc(1em * 1.3);
        }
        
        .project-row {
          position: relative;
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
          transition: opacity 0.1s ease-in-out;
        }
        
        @media (max-width: 768px) {
          .image-preview {
            transition: opacity 0.05s ease-in-out;
          }
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

