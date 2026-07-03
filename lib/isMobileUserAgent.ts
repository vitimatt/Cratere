const MOBILE_UA_RE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i

export function isMobileUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return false
  if (MOBILE_UA_RE.test(userAgent)) return true
  // iPadOS 13+ reports as Macintosh with Mobile in the UA string
  return /\bMacintosh\b/.test(userAgent) && /\bMobile\b/.test(userAgent)
}
