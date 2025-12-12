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

  for (const slot of slots) {
    const key = `${pageNumber}-${slot.id}`
    const image = selectedImages.get(key)

    console.log(`Looking for key: "${key}"`)
    console.log(`  Found:`, image ? 'YES - has image' : 'NO - empty')
    if (image) {
      console.log(`  Image asset:`, image.asset?._ref || image.asset?._id || 'no ref/id')
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
        const imageUrl = urlFor(image.asset).width(2000).quality(90).url()
        console.log(`Loading image for slot ${slot.id}:`, imageUrl)

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
        
        // Get image dimensions
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
          // Scale to cover the entire slot
          const scaleByWidth = slotWidth / imgDimensions.width
          const scaleByHeight = slotHeight / imgDimensions.height
          const scale = Math.max(scaleByWidth, scaleByHeight) // Use max to cover
          
          finalWidth = imgDimensions.width * scale
          finalHeight = imgDimensions.height * scale
          
          // Center the image
          finalLeft = slotLeft + (slotWidth - finalWidth) / 2
          finalTop = slotTop + (slotHeight - finalHeight) / 2
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
        }
        
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
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`
    
    fetch(proxyUrl)
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

