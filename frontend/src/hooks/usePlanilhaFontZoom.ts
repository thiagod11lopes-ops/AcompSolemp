import { useEffect } from 'react'

export const PLANILHA_FONT_CSS_VAR = '--excel-sheet-font-size'
export const PLANILHA_FONT_SIZE_DEFAULT = '15px'
export const PLANILHA_FONT_SIZE_ZOOM_90 = '12px'

/** Estimativa do zoom do navegador (Chrome/Edge/Firefox desktop). */
export function getBrowserZoomPercent(): number {
  if (typeof window === 'undefined') return 100
  const { outerWidth, innerWidth } = window
  if (!outerWidth || !innerWidth) return 100
  return Math.round((outerWidth / innerWidth) * 100)
}

/** Em zoom ~90% a fonte da planilha vai para 12px; nos demais casos, 15px. */
export function resolvePlanilhaFontSize(zoomPercent = getBrowserZoomPercent()): string {
  return Math.abs(zoomPercent - 90) <= 3 ? PLANILHA_FONT_SIZE_ZOOM_90 : PLANILHA_FONT_SIZE_DEFAULT
}

export function syncPlanilhaFontZoom(): string {
  const size = resolvePlanilhaFontSize()
  document.documentElement.style.setProperty(PLANILHA_FONT_CSS_VAR, size)
  return size
}

/** Mantém --excel-sheet-font-size alinhado ao zoom do navegador. */
export function usePlanilhaFontZoom() {
  useEffect(() => {
    const sync = () => {
      syncPlanilhaFontZoom()
    }
    sync()
    window.addEventListener('resize', sync)
    window.visualViewport?.addEventListener('resize', sync)
    window.visualViewport?.addEventListener('scroll', sync)
    return () => {
      window.removeEventListener('resize', sync)
      window.visualViewport?.removeEventListener('resize', sync)
      window.visualViewport?.removeEventListener('scroll', sync)
    }
  }, [])
}
