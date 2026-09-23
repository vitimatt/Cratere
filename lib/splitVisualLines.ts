/**
 * Split text into the visual rows the browser would wrap into at `widthPx`,
 * using the same font metrics as `styleSource` (or defaults matching the site).
 * Preserves word boundaries unless the browser itself wraps mid-word.
 */
export function splitVisualLines(
  text: string,
  widthPx: number,
  styleSource?: HTMLElement | null
): string[] {
  if (!text) return []
  if (typeof document === 'undefined' || widthPx <= 0) return [text]

  const measureEl = document.createElement('div')
  const computed = styleSource ? window.getComputedStyle(styleSource) : null

  measureEl.style.cssText = [
    'position:absolute',
    'visibility:hidden',
    'pointer-events:none',
    'left:0',
    'top:0',
    `width:${widthPx}px`,
    'padding:0',
    'margin:0',
    'border:0',
    'box-sizing:border-box',
    'white-space:normal',
    `font-family:${computed?.fontFamily || 'Helvetica, sans-serif'}`,
    `font-size:${computed?.fontSize || '14px'}`,
    `font-weight:${computed?.fontWeight || '400'}`,
    `font-style:${computed?.fontStyle || 'normal'}`,
    `letter-spacing:${computed?.letterSpacing || 'normal'}`,
    `word-spacing:${computed?.wordSpacing || 'normal'}`,
    `line-height:${computed?.lineHeight || '130%'}`,
    `word-break:${computed?.wordBreak || 'normal'}`,
    `overflow-wrap:${computed?.overflowWrap || 'normal'}`,
  ].join(';')

  measureEl.textContent = text
  document.body.appendChild(measureEl)

  const textNode = measureEl.firstChild
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    document.body.removeChild(measureEl)
    return [text]
  }

  const range = document.createRange()
  const lines: string[] = []
  let lineStart = 0
  let lastTop: number | null = null

  for (let i = 0; i < text.length; i++) {
    range.setStart(textNode, i)
    range.setEnd(textNode, i + 1)
    const rects = range.getClientRects()
    if (!rects.length) continue
    const top = rects[0].top
    if (lastTop === null) {
      lastTop = top
    } else if (top > lastTop + 0.5) {
      const line = text.slice(lineStart, i)
      if (line.length) lines.push(line)
      lineStart = i
      lastTop = top
    }
  }

  const last = text.slice(lineStart)
  if (last.length) lines.push(last)

  document.body.removeChild(measureEl)
  return lines.length > 0 ? lines : [text]
}
