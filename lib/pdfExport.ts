import jsPDF from 'jspdf'
import { urlFor } from './imageUrl'

interface ImageData {
  asset: any
  title?: string
  year: number
  index: number
  assetMetadata?: any
}

interface Slot {
  id: string
  width: string
  height: string
  left?: string
  top?: string
  aspectRatio?: 'square' | '3:2' | '2:3' | 'free'
  cropMode?: 'fill' | 'fit'
}

interface PageLayout {
  pageNumber: number
  isSinglePage: boolean
  slots: Slot[]
}

type PageLayoutsMap = Record<number, PageLayout>

// Convert mm to points (1mm = 2.83465 points for PDF)
const mmToPt = (mm: string): number => {
  const num = parseFloat(mm.replace('mm', ''))
  return num * 2.83465
}

// Convert mm string to number in mm
const mmToNum = (mm: string): number => {
  return parseFloat(mm.replace('mm', ''))
}

export async function exportToPDF(
  selectedImages: Map<string, ImageData | null>,
  pageLayouts: PageLayoutsMap,
  filename?: string
): Promise<void> {
  console.log('=== Starting PDF export ===')
  console.log('Selected images Map size:', selectedImages.size)
  console.log('All stored keys:', Array.from(selectedImages.keys()))
  console.log('All stored entries:', Array.from(selectedImages.entries()).map(([key, img]) => ({
    key,
    hasImage: !!img,
    assetRef: img?.asset?._ref || img?.asset?._id || 'none'
  })))
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // A4 dimensions in mm
  const pageWidth = 210
  const pageHeight = 297

  // Process pages in order: single pages first, then spreads
  const pageNumbers = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32]

  for (let i = 0; i < pageNumbers.length; i++) {
    const pageNum = pageNumbers[i]
    const layout = pageLayouts[pageNum]

    if (!layout) continue

    // Add new page (except for the first one)
    if (i > 0) {
      pdf.addPage()
    }

    if (layout.isSinglePage) {
      // Single page (cover or back cover)
      await renderPage(pdf, pageNum, layout, selectedImages, pageWidth, pageHeight)
    } else {
      // Two-page spread - render left page
      await renderPage(pdf, pageNum, layout, selectedImages, pageWidth, pageHeight, 'left')
      
      // Add right page
      pdf.addPage()
      // For right page, we need to get slots for the right side
      await renderPage(pdf, pageNum + 1, layout, selectedImages, pageWidth, pageHeight, 'right')
    }
  }

  // Generate filename from title or use default
  let pdfFilename = 'cratere-layout.pdf'
  if (filename && filename.trim()) {
    // Sanitize filename: remove invalid characters and limit length
    const sanitized = filename
      .trim()
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .substring(0, 100) // Limit length
    if (sanitized) {
      pdfFilename = `${sanitized}.pdf`
    }
  }
  
  // Save the PDF
  pdf.save(pdfFilename)
}

async function renderPage(
  pdf: jsPDF,
  pageNumber: number,
  layout: PageLayout,
  selectedImages: Map<string, ImageData | null>,
  pageWidth: number,
  pageHeight: number,
  side?: 'left' | 'right'
) {
  const slots = side
    ? layout.slots.filter(slot => slot.id.startsWith(side + '-'))
    : layout.slots

  console.log(`Rendering page ${pageNumber}, side: ${side || 'none'}, slots:`, slots.map(s => s.id))

  // Process slots sequentially to avoid race conditions with image loading
  for (const slot of slots) {
    const key = `${pageNumber}-${slot.id}`
    const image = selectedImages.get(key)

    console.log(`Looking for key: "${key}"`)
    console.log(`  Found:`, image ? 'YES - has image' : 'NO - empty')
    if (image) {
      const assetRef = image.asset?._ref || image.asset?._id || 'no ref/id'
      console.log(`  Image asset:`, assetRef)
      console.log(`  Image URL will be:`, urlFor(image.asset).width(2000).quality(90).url())
    }
    
    // Debug: show all keys in the map
    const allKeys = Array.from(selectedImages.keys())
    const matchingKeys = allKeys.filter(k => k.includes(slot.id))
    if (matchingKeys.length > 0) {
      console.log(`  Keys containing "${slot.id}":`, matchingKeys)
    }

    if (image && image.asset) {
      try {
        // Get image URL - use higher quality for PDF
        // Generate a unique URL for each image to ensure proper loading
        const imageUrl = urlFor(image.asset).width(2000).quality(90).url()
        console.log(`Loading image for slot ${slot.id} (key: ${key}):`, imageUrl)
        console.log(`  Asset ref:`, image.asset?._ref || image.asset?._id)

        const slotLeft = mmToNum(slot.left || '0')
        const slotTop = mmToNum(slot.top || '0')
        const slotWidth = mmToNum(slot.width)
        const slotHeight = mmToNum(slot.height)

        // Load image with retry logic
        let imgDataUrl: string | null = null
        let retries = 3
        while (retries > 0) {
          try {
            imgDataUrl = await loadImage(imageUrl)
            break
          } catch (error) {
            retries--
            if (retries === 0) throw error
            console.warn(`Retrying image load for slot ${slot.id}, ${retries} attempts left`)
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s before retry
          }
        }
        
        if (!imgDataUrl) {
          throw new Error(`Failed to load image for slot ${slot.id}`)
        }
        
        console.log(`Image loaded for slot ${slot.id}, adding to PDF`)
        
        // Get image dimensions (in pixels)
        const imgDimensions = await getImageDimensions(imgDataUrl)
        const imgAspectRatio = imgDimensions.width / imgDimensions.height
        const isHorizontal = imgDimensions.width > imgDimensions.height
        const slotAspectRatio = slotWidth / slotHeight
        
        // Calculate dimensions and position based on crop mode
        let finalWidth = slotWidth
        let finalHeight = slotHeight
        let finalLeft = slotLeft
        let finalTop = slotTop
        
        const cropMode = (slot as any).cropMode || 'fit'
        
        if (cropMode === 'fill') {
          // Fill the slot, crop if needed (cover behavior)
          // Calculate scale based on aspect ratios
          const imageAspectRatio = imgDimensions.width / imgDimensions.height
          const slotAspectRatio = slotWidth / slotHeight
          
          // Determine which dimension to scale by to cover the slot
          let scale: number
          if (imageAspectRatio > slotAspectRatio) {
            // Image is wider than slot - scale by height to fill slot height
            // This means we'll crop from the sides
            scale = slotHeight / slotWidth * imageAspectRatio
          } else {
            // Image is taller than slot - scale by width to fill slot width  
            // This means we'll crop from top/bottom
            scale = slotWidth / slotHeight / imageAspectRatio
          }
          
          // For fill mode, crop the image using canvas before adding to PDF
          const croppedImageDataUrl = await cropImageToSlot(
            imgDataUrl,
            imgDimensions.width,
            imgDimensions.height,
            slotWidth,
            slotHeight,
            imageAspectRatio,
            slotAspectRatio
          )
          
          // Determine image format from data URL
          const format = croppedImageDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
          
          // Add the cropped image, positioned at the slot location
          pdf.addImage(
            croppedImageDataUrl,
            format,
            slotLeft,
            slotTop,
            slotWidth,
            slotHeight
          )
        } else {
          // Fit mode: maintain aspect ratio, fit within slot (contain behavior)
          const scaleByWidth = slotWidth / imgDimensions.width
          const scaleByHeight = slotHeight / imgDimensions.height
          const scale = Math.min(scaleByWidth, scaleByHeight) // Use min to fit
          
          finalWidth = imgDimensions.width * scale
          finalHeight = imgDimensions.height * scale
          
          // Center the image
          finalLeft = slotLeft + (slotWidth - finalWidth) / 2
          finalTop = slotTop + (slotHeight - finalHeight) / 2
          
          // Determine image format from data URL
          const format = imgDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
          
          pdf.addImage(
            imgDataUrl,
            format,
            finalLeft,
            finalTop,
            finalWidth,
            finalHeight
          )
        }
        console.log(`✓ Image successfully added to PDF for slot ${slot.id} (${isHorizontal ? 'horizontal' : 'vertical'})`)
      } catch (error) {
        console.error(`✗ Error loading image for slot ${slot.id}:`, error)
        // Leave blank if image fails to load - don't draw grey box
      }
    } else {
      // Leave empty slot blank - don't draw grey box
    }
  }
}

function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use Next.js API route as proxy to avoid CORS issues
    // Add cache-busting parameter to ensure each image is loaded fresh
    const cacheBuster = Date.now() + Math.random()
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}&_cb=${cacheBuster}`
    
    // Disable caching to ensure we get fresh images
    fetch(proxyUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.blob()
      })
      .then(blob => {
        // Convert blob to data URL
        return new Promise<string>((resolveBlob, rejectBlob) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              resolveBlob(reader.result)
            } else {
              rejectBlob(new Error('Failed to convert blob to data URL'))
            }
          }
          reader.onerror = () => {
            rejectBlob(new Error('FileReader error'))
          }
          reader.readAsDataURL(blob)
        })
      })
      .then(dataUrl => {
        resolve(dataUrl)
      })
      .catch(fetchError => {
        console.error('Failed to load image via proxy:', fetchError, 'URL:', url)
        reject(new Error(`Failed to load image: ${url} - ${fetchError.message}`))
      })
  })
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }
    img.onerror = () => {
      reject(new Error('Failed to load image for dimension check'))
    }
    img.src = dataUrl
  })
}

async function cropImageToSlot(
  imageDataUrl: string,
  imgWidthPx: number,
  imgHeightPx: number,
  slotWidthMm: number,
  slotHeightMm: number,
  imageAspectRatio: number,
  slotAspectRatio: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        // Convert mm to pixels for canvas (using high DPI for quality)
        const dpi = 300
        const mmToPx = dpi / 25.4
        const slotWidthPx = slotWidthMm * mmToPx
        const slotHeightPx = slotHeightMm * mmToPx
        
        // Create canvas for the slot size
        const canvas = document.createElement('canvas')
        canvas.width = slotWidthPx
        canvas.height = slotHeightPx
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        
        // Calculate what portion of the original image to crop
        // We want to fill the slot, so we need to determine the crop area
        let sourceX = 0
        let sourceY = 0
        let sourceWidth = imgWidthPx
        let sourceHeight = imgHeightPx
        
        if (imageAspectRatio > slotAspectRatio) {
          // Image is wider than slot - crop from sides (center crop)
          // Calculate the width we need to show to match slot aspect ratio
          const targetWidth = imgHeightPx * slotAspectRatio
          sourceX = (imgWidthPx - targetWidth) / 2
          sourceWidth = targetWidth
        } else {
          // Image is taller than slot - crop from top/bottom (center crop)
          // Calculate the height we need to show to match slot aspect ratio
          const targetHeight = imgWidthPx / slotAspectRatio
          sourceY = (imgHeightPx - targetHeight) / 2
          sourceHeight = targetHeight
        }
        
        // Ensure we don't go beyond image boundaries
        sourceX = Math.max(0, Math.min(sourceX, imgWidthPx))
        sourceY = Math.max(0, Math.min(sourceY, imgHeightPx))
        sourceWidth = Math.min(sourceWidth, imgWidthPx - sourceX)
        sourceHeight = Math.min(sourceHeight, imgHeightPx - sourceY)
        
        // Draw the cropped portion of the image to the canvas
        // This will automatically scale it to fit the canvas (slot) exactly
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          canvas.width,
          canvas.height
        )
        
        // Convert canvas to data URL
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95)
        resolve(croppedDataUrl)
      } catch (error) {
        reject(error)
      }
    }
    img.onerror = () => {
      reject(new Error('Failed to load image for cropping'))
    }
    img.src = imageDataUrl
  })
}

