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
  const { setCurrentPage, currentPage, selectedImages, getLayout, setLayout, clearImagesForSpread, title, setTitle, totalPages, setTotalPages } = useDesigner()
  const [isExporting, setIsExporting] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isLayoutSelectionMode, setIsLayoutSelectionMode] = useState(false)
  const [isPageCountSelectionMode, setIsPageCountSelectionMode] = useState(false)
  const [previewLayout, setPreviewLayout] = useState<LayoutType | null>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    router.prefetch('/')
  }, [router])

  useEffect(() => {
    const pageParam = searchParams.get('page')
    if (pageParam) {
      const page = parseInt(pageParam, 10)
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page)
      }
    }
  }, [searchParams, setCurrentPage, totalPages])

  const getSpreadPageNumber = (page: number): number => {
    // For two-page spreads, return the left page number
    // Odd pages (3, 5, 7, etc.) belong to the spread starting at the previous even page
    if (page > 1 && page % 2 === 1) {
      return page - 1
    }
    return page
  }

  const spreadPageNumber = getSpreadPageNumber(currentPage)
  const currentLayout = getLayout(spreadPageNumber)
  const displayLayout = previewLayout || currentLayout
  const slots = getLayoutSlots(spreadPageNumber, displayLayout, totalPages)
  const isSinglePage = currentPage === 1 || currentPage === totalPages

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

  const handlePageCountChange = (pages: number) => {
    setTotalPages(pages)
    setIsPageCountSelectionMode(false)
    // If current page is beyond new total, navigate to last page
    if (currentPage > pages) {
      router.push(`/designer?page=${pages}`)
    }
  }

  const handleChangePageCountClick = () => {
    setIsPageCountSelectionMode(true)
  }

  const handleClosePageCountMenu = () => {
    setIsPageCountSelectionMode(false)
  }

  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      // Create page layout structure for PDF export using layout state
      const pageLayoutsForPDF: Record<number, { pageNumber: number; isSinglePage: boolean; slots: Array<{ id: string; width: string; height: string; left?: string; top?: string }> }> = {}
      
      // Add single pages
      pageLayoutsForPDF[1] = { pageNumber: 1, isSinglePage: true, slots: getLayoutSlots(1, 'large-top', totalPages) }
      pageLayoutsForPDF[totalPages] = { pageNumber: totalPages, isSinglePage: true, slots: getLayoutSlots(totalPages, 'large-top', totalPages) }
      
      // Add two-page spreads
      const spreadPages: number[] = []
      for (let i = 2; i < totalPages; i += 2) {
        spreadPages.push(i)
      }
      spreadPages.forEach(pageNum => {
        const layout = getLayout(pageNum)
        pageLayoutsForPDF[pageNum] = { pageNumber: pageNum, isSinglePage: false, slots: getLayoutSlots(pageNum, layout, totalPages) }
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
            This is the cover of a {totalPages} pages book.
          </div>
        ) : currentPage === totalPages ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', fontSize: '14px', color: '#000' }}>
            <span>This is the back-cover of your {totalPages} pages book.&nbsp;</span>
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
            <button
              onClick={handleChangePageCountClick}
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
              Change Page N°
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
      {/* Page count selection menu */}
      {isPageCountSelectionMode && (
        <>
          {/* Backdrop overlay - closes menu on click */}
          <div
            onClick={handleClosePageCountMenu}
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
            {[8, 16, 32, 64, 128].map((pageCount) => (
              <button
                key={pageCount}
                onClick={() => handlePageCountChange(pageCount)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#000',
                  fontFamily: 'inherit',
                  textDecoration: totalPages === pageCount ? 'underline' : 'none',
                }}
              >
                {pageCount}
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
          gap: '20px',
        }}
      >
        <button
          onClick={() => {
            const prevPage = currentPage <= 2 ? 1 : currentPage - 2
            if (currentPage > 1) {
              setCurrentPage(prevPage)
              router.push(`/designer?page=${prevPage}`)
            }
          }}
          disabled={currentPage <= 1}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: currentPage <= 1 ? 'default' : 'pointer',
            fontSize: '14px',
            color: currentPage <= 1 ? '#999' : '#000',
            fontFamily: 'inherit',
            textDecoration: 'none',
          }}
        >
          Previous
        </button>
        <div style={{ fontSize: '14px', color: '#000' }}>
          {isSinglePage ? `${currentPage}` : `${currentPage}-${currentPage + 1}`} / {totalPages}
        </div>
        <button
          onClick={() => {
            const nextPage = currentPage === 1 ? 2 : Math.min(totalPages, currentPage + 2)
            if (currentPage < totalPages) {
              setCurrentPage(nextPage)
              router.push(`/designer?page=${nextPage}`)
            }
          }}
          disabled={currentPage >= totalPages}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: currentPage >= totalPages ? 'default' : 'pointer',
            fontSize: '14px',
            color: currentPage >= totalPages ? '#999' : '#000',
            fontFamily: 'inherit',
            textDecoration: 'none',
          }}
        >
          Next
        </button>
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

