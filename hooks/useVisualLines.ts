'use client'

import { useState, useEffect, useRef, type RefObject } from 'react'
import { splitVisualLines } from '../lib/splitVisualLines'

/**
 * Measure how `text` wraps inside `containerRef` and return each visual row.
 * Recomputes when the container width changes.
 */
export function useVisualLines(
  text: string,
  containerRef: RefObject<HTMLElement | null>
): { lines: string[]; ready: boolean } {
  const [lines, setLines] = useState<string[]>(() => (text ? [text] : []))
  const [ready, setReady] = useState(false)
  const textRef = useRef(text)
  textRef.current = text

  useEffect(() => {
    const el = containerRef.current
    if (!text) {
      setLines([])
      setReady(true)
      return
    }
    if (!el) {
      setLines([text])
      setReady(false)
      return
    }

    const measure = () => {
      const width = el.clientWidth
      if (width <= 0) return
      setLines(splitVisualLines(textRef.current, width, el))
      setReady(true)
    }

    measure()

    const ro = new ResizeObserver(() => {
      measure()
    })
    ro.observe(el)
    window.addEventListener('resize', measure)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [text, containerRef])

  return { lines, ready }
}
