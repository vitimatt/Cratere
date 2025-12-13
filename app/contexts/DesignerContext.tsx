'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface ImageData {
  asset: any
  title?: string
  year: number
  index: number
  assetMetadata?: any
}

export type LayoutType = 'large-top' | 'medium-centered' | '4-horizontal' | '4-vertical'

interface SelectionContext {
  pageNumber: number
  slotId: string
}

interface DesignerContextType {
  selectedImages: Map<string, ImageData | null>
  currentPage: number
  selectionContext: SelectionContext | null
  layouts: Map<number, LayoutType>
  title: string
  setSelectedImage: (pageNumber: number, slotId: string, image: ImageData | null) => void
  setCurrentPage: (page: number) => void
  setSelectionContext: (context: SelectionContext | null) => void
  setLayout: (pageNumber: number, layout: LayoutType) => void
  getLayout: (pageNumber: number) => LayoutType
  setTitle: (title: string) => void
  clearSelection: () => void
  clearImagesForSpread: (pageNumber: number) => void
}

const DesignerContext = createContext<DesignerContextType | undefined>(undefined)

export function DesignerProvider({ children }: { children: ReactNode }) {
  const [selectedImages, setSelectedImages] = useState<Map<string, ImageData | null>>(new Map())
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [selectionContext, setSelectionContext] = useState<SelectionContext | null>(null)
  const [layouts, setLayouts] = useState<Map<number, LayoutType>>(new Map())
  const [title, setTitle] = useState<string>('')

  const setSelectedImage = (pageNumber: number, slotId: string, image: ImageData | null) => {
    setSelectedImages(prev => {
      const newMap = new Map(prev)
      const key = `${pageNumber}-${slotId}`
      newMap.set(key, image)
      return newMap
    })
  }

  const setLayout = (pageNumber: number, layout: LayoutType) => {
    setLayouts(prev => {
      const newMap = new Map(prev)
      newMap.set(pageNumber, layout)
      return newMap
    })
  }

  const getLayout = (pageNumber: number): LayoutType => {
    return layouts.get(pageNumber) || 'large-top'
  }

  const clearSelection = () => {
    setSelectedImages(new Map())
  }

  const clearImagesForSpread = (pageNumber: number) => {
    setSelectedImages(prev => {
      const newMap = new Map(prev)
      // Clear images for both pages in the spread
      const spreadPages = pageNumber === 1 ? [1] : pageNumber === 32 ? [32] : [pageNumber, pageNumber + 1]
      spreadPages.forEach(p => {
        // Remove all keys that start with this page number
        Array.from(newMap.keys()).forEach(key => {
          if (key.startsWith(`${p}-`)) {
            newMap.delete(key)
          }
        })
      })
      return newMap
    })
  }

  return (
    <DesignerContext.Provider
      value={{
        selectedImages,
        currentPage,
        selectionContext,
        layouts,
        title,
        setSelectedImage,
        setCurrentPage,
        setSelectionContext,
        setLayout,
        getLayout,
        setTitle,
        clearSelection,
        clearImagesForSpread,
      }}
    >
      {children}
    </DesignerContext.Provider>
  )
}

export function useDesigner() {
  const context = useContext(DesignerContext)
  if (context === undefined) {
    throw new Error('useDesigner must be used within a DesignerProvider')
  }
  return context
}

