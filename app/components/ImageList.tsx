'use client'

import { useState, useEffect } from 'react'
import { urlFor } from '../../lib/imageUrl'

interface ImageItem {
  asset: any
  title?: string
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
  }>
}

interface ImageListProps {
  images: ImageItem[]
  projects: Project[]
}

export default function ImageList({ images, projects }: ImageListProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [hoveredProjectIndex, setHoveredProjectIndex] = useState<number | null>(null)
  const [hoveredProjectImageIndex, setHoveredProjectImageIndex] = useState<number | null>(null)
  const [hoveredColor, setHoveredColor] = useState<string | null>(null)
  const [hoveredRandomly, setHoveredRandomly] = useState<boolean>(false)
  const [randomImageIndex, setRandomImageIndex] = useState<number | null>(null)
  const [expandedAbout, setExpandedAbout] = useState<boolean>(false)
  const [visibleRows, setVisibleRows] = useState<Set<string>>(new Set())
  const [isReady, setIsReady] = useState<boolean>(false)

  useEffect(() => {
    // Mark as ready after a tiny delay to ensure styles are applied
    const timer = setTimeout(() => {
      setIsReady(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

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

  // Group images by color
  const imagesByColor = images.reduce((acc, image) => {
    const color = extractColorFromFilename(image.asset, image.assetMetadata)
    if (color) {
      if (!acc[color]) {
        acc[color] = []
      }
      acc[color].push(image)
    }
    return acc
  }, {} as Record<string, typeof images>)

  const colors = Object.keys(imagesByColor).sort()

  const getRandomImageForColor = (color: string): ImageItem | null => {
    const colorImages = imagesByColor[color]
    if (!colorImages || colorImages.length === 0) return null
    const randomIndex = Math.floor(Math.random() * colorImages.length)
    return colorImages[randomIndex]
  }

  // Animation: Show rows sequentially
  useEffect(() => {
    // Wait for content to load (check if we have data)
    if (images.length === 0 && projects.length === 0) return
    
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
          'empty-spacing',
          'empty',
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
  }, [images.length, projects.length, colors.length])

  return (
    <>
      <div className={`image-column ${isReady ? 'column-ready' : ''}`}>
        <div className={`header-title ${visibleRows.has('cratere') ? 'row-visible' : 'row-hidden'}`}>Cratere</div>
        <div className={`header-subtitle ${visibleRows.has('by-subject') ? 'row-visible' : 'row-hidden'}`}>By Subject</div>
        {images.map((image, index) => {
          const title = image.title || extractTitleFromFilename(image.asset, image.assetMetadata)
          
          return (
            <div
              key={image.index}
              className={`image-row ${visibleRows.has(`image-${index}`) ? 'row-visible' : 'row-hidden'}`}
              onMouseEnter={() => setHoveredIndex(image.index)}
              onMouseLeave={() => setHoveredIndex(null)}
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
          
          return (
            <div
              key={projectIndex}
              className={`project-row ${visibleRows.has(`project-${projectIndex}`) ? 'row-visible' : 'row-hidden'}`}
              onMouseLeave={() => {
                setHoveredProjectIndex(null)
                setHoveredProjectImageIndex(null)
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
                  {validImages.map((image, imgIndex) => (
                    <div
                      key={imgIndex}
                      className="project-image-section"
                      style={{ width: `${100 / imageCount}%` }}
                      onMouseEnter={() => {
                        setHoveredProjectIndex(projectIndex)
                        setHoveredProjectImageIndex(imgIndex)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
        
        <div className={`colors-spacing ${visibleRows.has('colors-spacing') ? 'row-visible' : 'row-hidden'}`}></div>
        <div className={`header-subtitle ${visibleRows.has('by-color') ? 'row-visible' : 'row-hidden'}`}>By Color</div>
        
        {colors.map((color) => {
          // Format color name: capitalize first letter
          const formattedColor = color.charAt(0).toUpperCase() + color.slice(1).toLowerCase()
          return (
            <div
              key={color}
              className={`color-row ${visibleRows.has(`color-${color}`) ? 'row-visible' : 'row-hidden'}`}
              onMouseEnter={() => setHoveredColor(color)}
              onMouseLeave={() => setHoveredColor(null)}
            >
              <span className="color-name">{formattedColor}</span>
            </div>
          )
        })}
        
        <div className={`randomly-spacing ${visibleRows.has('randomly-spacing') ? 'row-visible' : 'row-hidden'}`}></div>
        <div
          className={`randomly-row ${visibleRows.has('randomly') ? 'row-visible' : 'row-hidden'}`}
          onMouseEnter={() => {
            const validImages = images.filter(img => img?.asset)
            if (validImages.length > 0) {
              const randomIndex = Math.floor(Math.random() * validImages.length)
              setRandomImageIndex(randomIndex)
              setHoveredRandomly(true)
            }
          }}
          onMouseLeave={() => {
            setHoveredRandomly(false)
            setRandomImageIndex(null)
          }}
        >
          <span className="randomly-text">Randomly</span>
        </div>
        
        <div className={`empty-spacing ${visibleRows.has('empty-spacing') ? 'row-visible' : 'row-hidden'}`}></div>
        <div className={`empty-row ${visibleRows.has('empty') ? 'row-visible' : 'row-hidden'}`}>
          <span className="empty-text">Empty</span>
        </div>
        
        <div className={`about-spacing ${visibleRows.has('about-spacing') ? 'row-visible' : 'row-hidden'}`}></div>
        <div className={`about-row ${visibleRows.has('about') ? 'row-visible' : 'row-hidden'}`}>
          <button
            className="about-toggle"
            onClick={() => setExpandedAbout(!expandedAbout)}
          >
            {expandedAbout ? (
              <div className="about-content">
                <div className="about-line-first">-</div>
                <div className="about-line">Founded by Alessio Pinna, Felipe Menezes and Riccardo Alippi The crater is the circular cavity at the apex of a volcanic cone.</div>
                <div className="about-line">The Crater (in Latin Crater, "cup") is one of the 88 modern constellations and represents the chalice from which Apollo drank the nectar of the Gods. Studio Cratere is a photography and creative studio. We want to see the world and give it meaning.</div>
                <div className="about-line">Represented by C41.eu M: +39 3208740367</div>
                <div className="about-line">studio@cratere.studio M: +39 3208740367</div>
                <div className="about-line">Viale Abruzzi 32</div>
                <div className="about-line-spacing"></div>
                <div className="about-line">Website: Matteo Viti</div>
              </div>
            ) : (
              <span>+</span>
            )}
          </button>
        </div>
      </div>
      
      {hoveredIndex !== null && (
        <div className="image-preview-overlay">
          <img
            src={urlFor(images[hoveredIndex - 1].asset).width(2000).url()}
            alt={images[hoveredIndex - 1].title || extractTitleFromFilename(images[hoveredIndex - 1].asset, images[hoveredIndex - 1].assetMetadata) || `Image ${hoveredIndex}`}
            className="image-preview"
          />
        </div>
      )}
      
      {hoveredProjectIndex !== null && 
       hoveredProjectImageIndex !== null && 
       (() => {
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
      
      {hoveredColor && (() => {
        const randomImage = getRandomImageForColor(hoveredColor)
        if (!randomImage?.asset) return null
        return (
          <div className="image-preview-overlay">
            <img
              src={urlFor(randomImage.asset).width(2000).url()}
              alt={randomImage.title || extractTitleFromFilename(randomImage.asset, randomImage.assetMetadata) || `Color ${hoveredColor}`}
              className="image-preview"
            />
          </div>
        )
      })()}
      
      {hoveredRandomly && randomImageIndex !== null && (() => {
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
        
        .about-line-first {
          line-height: 130%;
          margin-bottom: 0;
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
      `}</style>
    </>
  )
}

