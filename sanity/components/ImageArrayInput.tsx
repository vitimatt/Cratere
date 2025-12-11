import React, { useEffect, useRef } from 'react'
import { ArrayOfObjectsInputProps, set, useFormValue, PatchEvent, useClient } from 'sanity'

/**
 * Parses filename to extract title and color
 * Example: "Wrapping_Paper-White.jpg" -> { title: "Wrapping Paper", color: "White" }
 */
function parseFilename(filename: string): { title: string; color: string } {
  if (!filename) return { title: '', color: '' }
  
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
  
  // Split by dash to separate title and color
  const parts = nameWithoutExt.split('-')
  
  if (parts.length >= 2) {
    // Last part is the color
    const color = parts[parts.length - 1].trim()
    // Everything before the last dash is the title
    const titlePart = parts.slice(0, -1).join('-')
    // Replace underscores with spaces and trim
    const title = titlePart.replace(/_/g, ' ').trim()
    
    return { title, color }
  }
  
  // If no dash found, use the whole filename as title
  const title = nameWithoutExt.replace(/_/g, ' ').trim()
  return { title, color: '' }
}

export function ImageArrayInput(props: ArrayOfObjectsInputProps) {
  const { onChange, renderDefault, value } = props
  const client = useClient({ apiVersion: '2023-01-01' })
  
  // Track processed images to avoid infinite loops
  const processedImagesRef = useRef<Set<string>>(new Set())
  
  useEffect(() => {
    if (!value || !Array.isArray(value)) return
    
    // Process each image in the array
    value.forEach((item: any, index: number) => {
      // For image type, the asset ref is directly on the item
      if (!item?.asset?._ref) return
      
      const assetRef = item.asset._ref
      
      // Skip if already processed
      if (processedImagesRef.current.has(`${index}-${assetRef}`)) {
        return
      }
      
      // Extract asset ID from reference
      const assetId = assetRef.replace(/^image-/, '').split('-')[0]
      
      client
        .getDocument(assetId)
        .then((asset: any) => {
          if (asset?.originalFilename) {
            const { title, color } = parseFilename(asset.originalFilename)
            
            // Only auto-populate if fields are empty
            const patches: any[] = []
            
            if (!item.title && title) {
              patches.push(set(title, [index, 'title']))
            }
            
            if (!item.color && color) {
              patches.push(set(color, [index, 'color']))
            }
            
            if (patches.length > 0) {
              processedImagesRef.current.add(`${index}-${assetRef}`)
              onChange(PatchEvent.from(patches))
            }
          }
        })
        .catch((err) => {
          console.warn('Could not fetch asset metadata:', err)
        })
    })
  }, [value, onChange, client])
  
  // Render the default array input
  return <>{renderDefault(props)}</>
}

