'use client'

import { useState, useEffect, useRef } from 'react'
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
  const horizontalScrollRef = useRef<HTMLDivElement>(null)

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
  
  // Scroll handler for mobile - find which row is at vertical center
  useEffect(() => {
    if (!isMobile) return
    
    const handleScroll = () => {
      const viewportCenter = window.innerHeight / 2
      
      // Check image rows
      let closestRow: { id: string; distance: number } | null = null
      
      const getMinDistance = () => (closestRow ? closestRow.distance : Infinity)

      // Check "By Subject" header
      if (bySubjectRef.current) {
        const rect = bySubjectRef.current.getBoundingClientRect()
        const center = rect.top + rect.height / 2
        const distance = Math.abs(center - viewportCenter)
        if (distance < getMinDistance()) {
          closestRow = { id: 'by-subject', distance }
        }
      }
      
      // Check all image rows
      images.forEach((image, index) => {
        const rowId = `image-${index}`
        const element = rowRefs.current.get(rowId)
        if (element) {
          const rect = element.getBoundingClientRect()
          const center = rect.top + rect.height / 2
          const distance = Math.abs(center - viewportCenter)
          if (distance < getMinDistance()) {
            closestRow = { id: rowId, distance }
          }
        }
      })
      
      // Check project rows
      projects.forEach((project, projectIndex) => {
        const rowId = `project-${projectIndex}`
        const element = rowRefs.current.get(rowId)
        if (element) {
          const rect = element.getBoundingClientRect()
          const center = rect.top + rect.height / 2
          const distance = Math.abs(center - viewportCenter)
          if (distance < getMinDistance()) {
            closestRow = { id: rowId, distance }
          }
        }
      })
      
      // Check color rows
      colors.forEach((color) => {
        const rowId = `color-${color}`
        const element = rowRefs.current.get(rowId)
        if (element) {
          const rect = element.getBoundingClientRect()
          const center = rect.top + rect.height / 2
          const distance = Math.abs(center - viewportCenter)
          if (distance < getMinDistance()) {
            closestRow = { id: rowId, distance }
          }
        }
      })
      
      // Check randomly row
      const randomlyElement = rowRefs.current.get('randomly')
      if (randomlyElement) {
        const rect = randomlyElement.getBoundingClientRect()
        const center = rect.top + rect.height / 2
        const distance = Math.abs(center - viewportCenter)
        if (distance < getMinDistance()) {
          closestRow = { id: 'randomly', distance }
        }
      }
      
      // Update state based on closest row
      if (closestRow) {
        if (closestRow.id.startsWith('image-')) {
          const index = parseInt(closestRow.id.replace('image-', ''))
          setCenteredImageIndex(images[index]?.index || null)
          setCenteredProjectIndex(null)
          setCenteredColor(null)
          setCenteredRandomly(false)
        } else if (closestRow.id.startsWith('project-')) {
          const projectIndex = parseInt(closestRow.id.replace('project-', ''))
          const project = projects[projectIndex]
          if (project) {
            const validImages = project.images?.filter(img => img?.asset) || []
            if (validImages.length > 0) {
              // Set project index (imageIndex not needed since we show all images)
              setCenteredProjectIndex({ projectIndex, imageIndex: 0 })
              setCenteredImageIndex(null)
              setCenteredColor(null)
              setCenteredRandomly(false)
            }
          }
        } else if (closestRow.id.startsWith('color-')) {
          const color = closestRow.id.replace('color-', '')
          setCenteredColor(color)
          setCenteredImageIndex(null)
          setCenteredProjectIndex(null)
          setCenteredRandomly(false)
        } else if (closestRow.id === 'randomly') {
          const validImages = images.filter(img => img?.asset)
          if (validImages.length > 0) {
            // Only set random image if not already set, to avoid flickering
            if (randomImageIndex === null) {
              const randomIndex = Math.floor(Math.random() * validImages.length)
              setRandomImageIndex(randomIndex)
            }
            setCenteredRandomly(true)
            setCenteredImageIndex(null)
            setCenteredProjectIndex(null)
            setCenteredColor(null)
          }
        } else {
          // Reset random image when leaving randomly row
          if (centeredRandomly) {
            setRandomImageIndex(null)
          }
          // Reset all when on header or other non-image rows
          setCenteredImageIndex(null)
          setCenteredProjectIndex(null)
          setCenteredColor(null)
          setCenteredRandomly(false)
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
  }, [isMobile, images, projects, colors.length])
  
  // Scroll horizontal container to center when project is centered
  useEffect(() => {
    if (!isMobile || !centeredProjectIndex || !horizontalScrollRef.current) return
    
    // Scroll to center the first image (10vw padding centers it)
    const scrollContainer = horizontalScrollRef.current
    scrollContainer.scrollLeft = 0
    
    // Ensure the container is scrollable
    const container = scrollContainer.querySelector('.project-images-container') as HTMLElement
    if (container) {
      // Force a reflow to ensure scrolling works
      container.offsetHeight
    }
  }, [isMobile, centeredProjectIndex])
  

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
          'colors-spacing',
          'by-color',
          ...colors.map((color) => `color-${color}`),
          'randomly-spacing',
          'randomly',
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
  }, [images.length, projects.length, colors.length])

  return (
    <>
      <div className={`image-column ${isReady ? 'column-ready' : ''}`} style={{ marginTop: '150px' }}>
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
        <div className={`header-subtitle ${visibleRows.has('by-commissioner') ? 'row-visible' : 'row-hidden'}`}>By Commisioner</div>
        
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
        
        <div className={`colors-spacing ${visibleRows.has('colors-spacing') ? 'row-visible' : 'row-hidden'}`}></div>
        <div className={`header-subtitle ${visibleRows.has('by-color') ? 'row-visible' : 'row-hidden'}`}>By Color</div>
        
        {colors.map((colorKey) => {
          const colorGroup = imagesByColor[colorKey]
          const formattedColor = colorGroup?.label ?? colorKey
          return (
            <div
              key={colorKey}
              ref={(el) => {
                if (el) rowRefs.current.set(`color-${colorKey}`, el)
              }}
              className={`color-row ${visibleRows.has(`color-${colorKey}`) ? 'row-visible' : 'row-hidden'}`}
              data-row-id={`color-${colorKey}`}
              onMouseEnter={() => !isMobile && setHoveredColor(colorKey)}
              onMouseLeave={() => !isMobile && setHoveredColor(null)}
            >
              <span className="color-name">{formattedColor}</span>
            </div>
          )
        })}
        
        <div className={`randomly-spacing ${visibleRows.has('randomly-spacing') ? 'row-visible' : 'row-hidden'}`}></div>
        <div
          ref={(el) => {
            if (el) rowRefs.current.set('randomly', el)
          }}
          className={`randomly-row ${visibleRows.has('randomly') ? 'row-visible' : 'row-hidden'}`}
          data-row-id="randomly"
          onMouseEnter={() => {
            if (!isMobile) {
              const validImages = images.filter(img => img?.asset)
              if (validImages.length > 0) {
                const randomIndex = Math.floor(Math.random() * validImages.length)
                setRandomImageIndex(randomIndex)
                setHoveredRandomly(true)
              }
            }
          }}
          onMouseLeave={() => {
            if (!isMobile) {
              setHoveredRandomly(false)
              setRandomImageIndex(null)
            }
          }}
        >
          <span className="randomly-text">Randomly</span>
        </div>
        
        <div className={`about-spacing ${visibleRows.has('about-spacing') ? 'row-visible' : 'row-hidden'}`}></div>
        <div className={`about-row ${visibleRows.has('about') ? 'row-visible' : 'row-hidden'}`}>
          <div className="about-content">
            <div className="about-line">Founded by Alessio Pinna, Felipe Menezes and Riccardo Alippi The crater is the circular cavity at the apex of a volcanic cone.</div>
            <div className="about-line">The Crater (in Latin Crater, &quot;cup&quot;) is one of the 88 modern constellations and represents the chalice from which Apollo drank the nectar of the Gods. Studio Cratere is a photography and creative studio. We want to see the world and give it meaning.</div>
            <div className="about-line">Represented by C41.eu M: +39 3208740367</div>
            <div className="about-line">studio@cratere.studio M: +39 3208740367</div>
            <div className="about-line">Viale Abruzzi 32</div>
            <div className="about-line-spacing"></div>
            <div className="about-line">Website: Matteo Viti</div>
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
      
      {/* Mobile: Show all project images horizontally when centered */}
      {isMobile && centeredProjectIndex !== null && (() => {
        const project = projects[centeredProjectIndex.projectIndex]
        if (!project) return null
        const validImages = project.images?.filter(img => img?.asset) || []
        if (validImages.length === 0) return null
        
        return (
          <div 
            ref={horizontalScrollRef}
            className="project-images-horizontal-scroll"
          >
            <div className="project-images-container">
              {validImages.map((image, imgIndex) => (
                <div key={imgIndex} className="project-image-item">
                  <img
                    src={urlFor(image.asset).width(2000).url()}
                    alt={project.title || `Project ${centeredProjectIndex.projectIndex + 1} Image ${imgIndex + 1}`}
                    className="project-image-horizontal"
                  />
                </div>
              ))}
            </div>
          </div>
        )
      })()}
      
      {((isMobile && centeredColor) || (!isMobile && hoveredColor)) && (() => {
        const colorKey = isMobile ? centeredColor! : hoveredColor!
        const colorLabel = isMobile ? centeredColorLabel : hoveredColorLabel
        const randomImage = getRandomImageForColor(colorKey)
        if (!randomImage?.asset) return null
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
      
      {((isMobile && centeredRandomly) || (!isMobile && hoveredRandomly)) && randomImageIndex !== null && (() => {
        const validImages = images.filter(img => img?.asset)
        if (validImages.length === 0 || randomImageIndex >= validImages.length) return null
        const randomImage = validImages[randomImageIndex]
        if (!randomImage?.asset) return null
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
            padding-top: 50vh;
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
        
        .about-line-spacing {
          margin-top: calc(1em * 1.3 * 3);
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
          .project-images-horizontal-scroll {
            position: fixed;
            top: 0;
            left: 0;
            z-index: 5;
            pointer-events: auto;
            width: 100vw;
            height: 100vh;
            overflow-x: scroll;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
            touch-action: pan-x pan-y;
            overscroll-behavior: none;
            overscroll-behavior-x: none;
            overscroll-behavior-y: none;
          }
          
          .project-images-horizontal-scroll::-webkit-scrollbar {
            display: none;
          }
          
          .project-images-container {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            height: 100vh;
            padding-left: 10vw;
            padding-right: 10vw;
            gap: 20vw;
            flex-wrap: nowrap;
            width: max-content;
          }
          
          .project-image-item {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 80vw;
            min-width: 80vw;
            height: 100vh;
          }
          
          .project-image-horizontal {
            width: 80vw;
            max-height: 80vh;
            height: auto;
            object-fit: contain;
            display: block;
            pointer-events: none;
          }
        }
      `}</style>
    </>
  )
}

