'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { urlFor } from '../../lib/imageUrl'

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
}

export default function CommercialImageList({ images, projects }: CommercialImageListProps) {
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
  
  // Scroll handler for mobile - find which row is at top line (15px from viewport, same as homepage)
  useEffect(() => {
    if (!isMobile) return
    const detectionLine = 15
    const handleScroll = () => {
      let closestRow: { id: string; distance: number } | null = null
      const getMinDistance = () => (closestRow ? closestRow.distance : Infinity)
      const distToLine = (rect: DOMRect) => {
        if (rect.top <= detectionLine && rect.bottom >= detectionLine) return 0
        return Math.abs(rect.top - detectionLine)
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
    handleScroll() // Initial check
    
    return () => {
      window.removeEventListener('scroll', throttledScroll)
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
            <div className="about-line">Founded by Alessio Pinna, Felipe Menezes and Riccardo Alippi The crater is the circular cavity at the apex of a volcanic cone. The Crater (in Latin Crater, &quot;cup&quot;) is one of the 88 modern constellations and represents the chalice from which Apollo drank the nectar of the Gods. Studio Cratere is a photography and creative studio. We want to see the world and give it meaning.</div>
            <div className="about-line-spacing"></div>
            <div className="about-line">Download portfolio</div>
            <div className="about-line-spacing"></div>
            <div className="about-line about-line-tight">Selected Pubblications</div>
            <div className="about-line about-line-tight">Arxipelag - Sul Sentiero</div>
            <div className="about-line about-line-tight">Phroom, Zone Magazine - Teleonomia</div>
            <div className="about-line about-line-tight">Perimetro - La Cattedrale</div>
            <div className="about-line about-line-tight">C41 - Boring Cactus</div>
            <div className="about-line about-line-tight">Highsnobiety, Nss sport, Hypebeast - Nike ACG Train</div>
            <div className="about-line-spacing"></div>
            <div className="about-line about-line-tight">Selected Exhibitions</div>
            <div className="about-line about-line-tight">@Daste Bergamo, &quot;One Eye Sees, The Other Feels&quot;, 30/04/2022 - 14/05/2022</div>
            <div className="about-line about-line-tight">@Studio Cratere, &quot;Everything Be Revealed In Time&quot;, 05/04/2024 - 03/05/2024</div>
            <div className="about-line about-line-tight">@Studio Cratere, &quot;Lucid Dreams&quot;, 13/06/2024 - 12/07/2024</div>
            <div className="about-line about-line-tight">@Studio Cratere, &quot;by PHONE&quot;, 23/10/2024 - review on Phroom and Outpump</div>
            <div className="about-line-spacing"></div>
            <div className="about-line about-line-tight">Commissions</div>
            <div className="about-line about-line-tight">Represented by C41.eu</div>
            <div className="about-line-spacing"></div>
            <div className="about-line about-line-tight">studio@cratere.studio</div>
            <div className="about-line about-line-tight">M: +39 3208740367</div>
            <div className="about-line-spacing"></div>
            <div className="about-line about-line-tight">General Info</div>
            <div className="about-line about-line-tight">contact@cratere.studio</div>
            <div className="about-line-spacing"></div>
            <div className="about-line about-line-tight">Address</div>
            <div className="about-line about-line-tight">Viale Abruzzi 32</div>
            <div className="about-line-spacing"></div>
            <div className="about-line about-line-tight">Website</div>
            <div className="about-line about-line-tight">Matteo Viti</div>
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
            padding-top: 15px;
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
            gap: 20vw;
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

