import { LayoutType } from '../app/contexts/DesignerContext'

export interface Slot {
  id: string
  width: string
  height: string
  left?: string
  top?: string
  aspectRatio?: 'square' | '3:2' | '2:3' | 'free'
  cropMode?: 'fill' | 'fit'
}

// A4 dimensions: 210mm x 297mm

export function getLayoutSlots(pageNumber: number, layoutType: LayoutType): Slot[] {
  if (pageNumber === 1) {
    // Cover - always large-top style
    return [
      { id: 'cover-1', width: '190mm', height: '277mm', left: '10mm', top: '10mm', aspectRatio: 'free', cropMode: 'fit' },
    ]
  }

  if (pageNumber === 32) {
    // Back cover - no slots
    return []
  }

  switch (layoutType) {
    case 'large-top':
      return getLargeTopLayout(pageNumber)
    case 'medium-centered':
      return getMediumCenteredLayout(pageNumber)
    case '4-horizontal':
      return get4HorizontalLayout(pageNumber)
    case '4-vertical':
      return get4VerticalLayout(pageNumber)
    default:
      return getLargeTopLayout(pageNumber)
  }
}

function getLargeTopLayout(pageNumber: number): Slot[] {
  // Current layout: 174mm x 261mm, 18mm margins
  return [
    { id: 'left-1', width: '174mm', height: '261mm', left: '18mm', top: '18mm', aspectRatio: '2:3', cropMode: 'fit' },
    { id: 'right-1', width: '174mm', height: '261mm', left: '18mm', top: '18mm', aspectRatio: '2:3', cropMode: 'fit' },
  ]
}

function getMediumCenteredLayout(pageNumber: number): Slot[] {
  // 30mm margins from sides = 150mm width
  // Square boxes: 150mm x 150mm
  // Centered vertically: (297 - 150) / 2 = 73.5mm from top
  return [
    { id: 'left-1', width: '150mm', height: '150mm', left: '30mm', top: '73.5mm', aspectRatio: 'square', cropMode: 'fit' },
    { id: 'right-1', width: '150mm', height: '150mm', left: '30mm', top: '73.5mm', aspectRatio: 'square', cropMode: 'fit' },
  ]
}

function get4HorizontalLayout(pageNumber: number): Slot[] {
  // 4 horizontal 3:2 aspect ratio images
  // 40mm margins from sides = 130mm width
  // For 3:2 ratio: height = width * 2/3 = 130 * 2/3 = 86.67mm
  // Top image: 40mm from top
  // Bottom image: 40mm from bottom
  // Bottom image top = 297 - 40 - 86.67 = 170.33mm
  const imageWidth = '130mm'
  const imageHeight = '86.67mm'
  const sideMargin = '40mm'
  const topMargin = '40mm'
  const bottomImageTop = '170.33mm'

  return [
    { id: 'left-top', width: imageWidth, height: imageHeight, left: sideMargin, top: topMargin, aspectRatio: '3:2', cropMode: 'fill' },
    { id: 'left-bottom', width: imageWidth, height: imageHeight, left: sideMargin, top: bottomImageTop, aspectRatio: '3:2', cropMode: 'fill' },
    { id: 'right-top', width: imageWidth, height: imageHeight, left: sideMargin, top: topMargin, aspectRatio: '3:2', cropMode: 'fill' },
    { id: 'right-bottom', width: imageWidth, height: imageHeight, left: sideMargin, top: bottomImageTop, aspectRatio: '3:2', cropMode: 'fill' },
  ]
}

function get4VerticalLayout(pageNumber: number): Slot[] {
  // 4 vertical 2:3 aspect ratio images
  // Two images per page, side by side (horizontally adjacent)
  // 10mm margin from page sides
  // 20mm between the two images on each page
  // Each image: width = (210 - 10*2 - 20) / 2 = 85mm
  // For 2:3 ratio: height = width * 3/2 = 85 * 3/2 = 127.5mm
  // Both images aligned on top: 10mm from top
  const imageWidth = '85mm'
  const imageHeight = '127.5mm'
  const sideMargin = '10mm'
  const gap = '20mm'
  const topMargin = '10mm'
  // Left image on left page: 10mm from left
  // Right image on left page: 10mm + 85mm + 20mm = 115mm from left
  // Left image on right page: 10mm from left (relative to right page)
  // Right image on right page: 115mm from left (relative to right page)
  const leftImageLeft = sideMargin
  const rightImageLeft = '115mm'

  return [
    { id: 'left-top', width: imageWidth, height: imageHeight, left: leftImageLeft, top: topMargin, aspectRatio: '2:3', cropMode: 'fill' },
    { id: 'left-bottom', width: imageWidth, height: imageHeight, left: rightImageLeft, top: topMargin, aspectRatio: '2:3', cropMode: 'fill' },
    { id: 'right-top', width: imageWidth, height: imageHeight, left: leftImageLeft, top: topMargin, aspectRatio: '2:3', cropMode: 'fill' },
    { id: 'right-bottom', width: imageWidth, height: imageHeight, left: rightImageLeft, top: topMargin, aspectRatio: '2:3', cropMode: 'fill' },
  ]
}

