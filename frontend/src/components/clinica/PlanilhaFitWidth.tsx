import { Box } from '@mui/material'
import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

interface PlanilhaFitWidthProps {
  /** Quando true, escala a planilha para ocupar 100% da largura disponível. */
  enabled: boolean
  children: ReactNode
  /** Dependências que alteram a largura natural da tabela (colunas, seleção, etc.). */
  remountKey?: string | number
}

/**
 * Escala o conteúdo para caber exatamente na largura do container
 * (referência: zoom do navegador em 100%), sem rolagem horizontal.
 * Todas as colunas ficam visíveis; rolagem vertical permanece se necessário.
 */
export function PlanilhaFitWidth({ enabled, children, remountKey }: PlanilhaFitWidthProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [scaledHeight, setScaledHeight] = useState<number | undefined>(undefined)

  useLayoutEffect(() => {
    if (!enabled) {
      setScale(1)
      setScaledHeight(undefined)
      return
    }

    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content) return

    const update = () => {
      const available = viewport.clientWidth
      // scrollWidth ignora transform — largura natural da grade.
      const naturalWidth = Math.max(content.scrollWidth, content.offsetWidth)
      const naturalHeight = Math.max(content.scrollHeight, content.offsetHeight)
      if (available <= 0 || naturalWidth <= 0) return

      const nextScale = available / naturalWidth
      setScale(nextScale)
      setScaledHeight(naturalHeight * nextScale)
    }

    // Aguarda o Dialog fullScreen estabilizar o layout.
    const raf = requestAnimationFrame(() => {
      update()
      requestAnimationFrame(update)
    })

    const ro = new ResizeObserver(() => update())
    ro.observe(viewport)
    ro.observe(content)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [enabled, remountKey])

  if (!enabled) {
    return <>{children}</>
  }

  return (
    <Box
      ref={viewportRef}
      sx={{
        width: '100%',
        flex: 1,
        minHeight: 0,
        overflowX: 'hidden',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: scaledHeight,
          position: 'relative',
        }}
      >
        <Box
          ref={contentRef}
          sx={{
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
            width: 'max-content',
            maxWidth: 'none',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}
