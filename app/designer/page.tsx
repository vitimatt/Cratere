'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useDesigner, LayoutType } from '../contexts/DesignerContext'
import PageSpread from '../components/PageSpread'
import { exportToPDF } from '../../lib/pdfExport'
import { getLayoutSlots } from '../../lib/layoutDefinitions'

const LAYOUT_OPTIONS: { type: LayoutType; label: string }[] = [
  { type: 'large-top', label: 'Large, on top' },
  { type: 'medium-centered', label: 'Medium, centered' },
  { type: '4-horizontal', label: '4 horizontal images' },
  { type: '4-vertical', label: '4 vertical images' },
]

function DesignerPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { setCurrentPage, currentPage, selectedImages, getLayout, setLayout, clearImagesForSpread } = useDesigner()
  const [isExporting, setIsExporting] = useState(false)
  const [title, setTitle] = useState<string>('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isLayoutSelectionMode, setIsLayoutSelectionMode] = useState(false)
  const [previewLayout, setPreviewLayout] = useState<LayoutType | null>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const pageParam = searchParams.get('page')
    if (pageParam) {
      const page = parseInt(pageParam, 10)
      if (page >= 1 && page <= 32) {
        setCurrentPage(page)
      }
    }
  }, [searchParams, setCurrentPage])

  const getSpreadPageNumber = (page: number): number => {
    // For two-page spreads, return the left page number
    if (page === 3) return 2
    if (page === 5) return 4
    if (page === 7) return 6
    if (page === 9) return 8
    if (page === 11) return 10
    if (page === 13) return 12
    if (page === 15) return 14
    if (page === 17) return 16
    if (page === 19) return 18
    if (page === 21) return 20
    if (page === 23) return 22
    if (page === 25) return 24
    if (page === 27) return 26
    if (page === 29) return 28
    if (page === 31) return 30
    return page
  }

  const spreadPageNumber = getSpreadPageNumber(currentPage)
  const currentLayout = getLayout(spreadPageNumber)
  const displayLayout = previewLayout || currentLayout
  const slots = getLayoutSlots(spreadPageNumber, displayLayout)
  const isSinglePage = currentPage === 1 || currentPage === 32

  const handleLayoutChange = (layoutType: LayoutType) => {
    setLayout(spreadPageNumber, layoutType)
    clearImagesForSpread(spreadPageNumber)
    setIsLayoutSelectionMode(false)
    setPreviewLayout(null)
  }

  const handleChangeLayoutClick = () => {
    if (isSinglePage) return // Don't allow layout changes for cover/back cover
    setIsLayoutSelectionMode(true)
  }

  const handleCloseLayoutMenu = () => {
    setIsLayoutSelectionMode(false)
    setPreviewLayout(null)
  }

  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      // Create page layout structure for PDF export using layout state
      const pageLayoutsForPDF: Record<number, { pageNumber: number; isSinglePage: boolean; slots: Array<{ id: string; width: string; height: string; left?: string; top?: string }> }> = {}
      
      // Add single pages
      pageLayoutsForPDF[1] = { pageNumber: 1, isSinglePage: true, slots: getLayoutSlots(1, 'large-top') }
      pageLayoutsForPDF[32] = { pageNumber: 32, isSinglePage: true, slots: getLayoutSlots(32, 'large-top') }
      
      // Add two-page spreads
      const spreadPages = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30]
      spreadPages.forEach(pageNum => {
        const layout = getLayout(pageNum)
        pageLayoutsForPDF[pageNum] = { pageNumber: pageNum, isSinglePage: false, slots: getLayoutSlots(pageNum, layout) }
      })

      await exportToPDF(selectedImages, pageLayoutsForPDF, title)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Error exporting PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <PageSpread 
        pageNumber={currentPage} 
        isSinglePage={isSinglePage} 
        slots={slots} 
        isLayoutPreviewMode={isLayoutSelectionMode}
        previewLayout={previewLayout}
      />
      {/* Top area - different content for cover/back cover */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          gap: '0',
        }}
      >
        {currentPage === 1 ? (
          <div style={{ fontSize: '14px', color: '#000' }}>
            This is the cover of a 32 pages book.
          </div>
        ) : currentPage === 32 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', fontSize: '14px', color: '#000' }}>
            <span>This is the back-cover of your 32 pages book.&nbsp;</span>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: isExporting ? 'wait' : 'pointer',
                fontSize: '14px',
                color: '#000',
                opacity: isExporting ? 0.5 : 1,
                textDecoration: 'none',
                fontFamily: 'inherit',
              }}
            >
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', fontSize: '14px', color: '#000' }}>
            <button
              onClick={handleChangeLayoutClick}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: '14px',
                color: '#000',
                textDecoration: 'none',
                fontFamily: 'inherit',
              }}
            >
              Change layout
            </button>
            <span>,&nbsp;</span>
            
            {isEditingTitle ? (
              <>
                <span
                  ref={measureRef}
                  style={{
                    position: 'absolute',
                    visibility: 'hidden',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    whiteSpace: 'pre',
                  }}
                >
                  {title || 'M'}
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    if (measureRef.current && inputRef.current) {
                      measureRef.current.textContent = e.target.value || 'M'
                      inputRef.current.style.width = `${measureRef.current.offsetWidth}px`
                    }
                  }}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingTitle(false)
                    }
                  }}
                  autoFocus
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0',
                    fontSize: '14px',
                    color: '#000',
                    fontFamily: 'inherit',
                    outline: 'none',
                    width: measureRef.current ? `${measureRef.current.offsetWidth}px` : '72px',
                  }}
                />
              </>
            ) : title ? (
              <button
                onClick={() => setIsEditingTitle(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#000',
                  textDecoration: 'none',
                  fontFamily: 'inherit',
                }}
              >
                {title}
              </button>
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#000',
                  textDecoration: 'none',
                  fontFamily: 'inherit',
                }}
              >
                Add title
              </button>
            )}
            <span>,&nbsp;</span>
            
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: isExporting ? 'wait' : 'pointer',
                fontSize: '14px',
                color: '#000',
                opacity: isExporting ? 0.5 : 1,
                textDecoration: 'none',
                fontFamily: 'inherit',
              }}
            >
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        )}
      </div>
      {/* Layout selection menu */}
      {isLayoutSelectionMode && !isSinglePage && (
        <>
          {/* Backdrop overlay - closes menu on click */}
          <div
            onClick={handleCloseLayoutMenu}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1999,
              backgroundColor: 'transparent',
            }}
          />
          {/* Menu */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: 'calc(80px + 3 * 1em)',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 2000,
              display: 'flex',
              flexDirection: 'column',
              gap: '0',
              alignItems: 'center',
              lineHeight: '1.3',
            }}
          >
            {LAYOUT_OPTIONS.map((option) => (
              <button
                key={option.type}
                onClick={() => handleLayoutChange(option.type)}
                onMouseEnter={() => setPreviewLayout(option.type)}
                onMouseLeave={() => setPreviewLayout(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#000',
                  fontFamily: 'inherit',
                  textDecoration: currentLayout === option.type ? 'underline' : 'none',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
      {/* Page counter - centered bottom */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        <div style={{ fontSize: '14px', color: '#000' }}>
          {isSinglePage ? `${currentPage}` : `${currentPage}-${currentPage + 1}`} / 32
        </div>
      </div>
    </div>
  )
}

export default function DesignerPage() {
  return (
    <Suspense fallback={<div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <DesignerPageContent />
    </Suspense>
  )
}

