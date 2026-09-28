import { Box, CircularProgress, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

interface PdfBlobViewerProps {
  /** Blob do PDF com type application/pdf (preferencial). */
  blob: Blob
  fileName?: string
}

/**
 * Renderiza PDF via PDF.js em canvas — evita o botão "Abrir" do viewer nativo
 * do Chrome, que falha dentro de Dialog/iframe com blob URL.
 */
export function PdfBlobViewer({ blob, fileName }: PdfBlobViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    let loadingTask: pdfjs.PDFDocumentLoadingTask | null = null
    const host = hostRef.current
    if (!host) return

    host.replaceChildren()
    setLoading(true)
    setError(null)
    setPageCount(0)

    void (async () => {
      try {
        const data = new Uint8Array(await blob.arrayBuffer())
        if (cancelled) return
        loadingTask = pdfjs.getDocument({ data, useSystemFonts: true })
        const pdf = await loadingTask.promise
        if (cancelled) {
          void pdf.destroy()
          return
        }
        setPageCount(pdf.numPages)

        const maxWidth = Math.max(host.clientWidth - 32, 320)

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          if (cancelled) break
          const page = await pdf.getPage(pageNum)
          if (cancelled) {
            page.cleanup()
            break
          }

          const unscaled = page.getViewport({ scale: 1 })
          const scale = Math.min(2.5, maxWidth / unscaled.width)
          const viewport = page.getViewport({ scale })

          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.style.display = 'block'
          canvas.style.margin = '0 auto 16px'
          canvas.style.maxWidth = '100%'
          canvas.style.height = 'auto'
          canvas.style.boxShadow = '0 2px 12px rgba(0,0,0,0.35)'
          canvas.setAttribute('aria-label', `${fileName ?? 'PDF'} — página ${pageNum}`)

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            page.cleanup()
            throw new Error('Canvas indisponível para renderizar o PDF.')
          }

          host.appendChild(canvas)
          await page.render({ canvasContext: ctx, viewport }).promise
          page.cleanup()
        }

        if (!cancelled) setLoading(false)
        void pdf.destroy()
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao renderizar o PDF.')
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
      if (loadingTask) void loadingTask.destroy()
      host.replaceChildren()
    }
  }, [blob, fileName])

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#525659',
        overflow: 'hidden',
      }}
    >
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            zIndex: 1,
            bgcolor: 'rgba(82,86,89,0.72)',
          }}
        >
          <CircularProgress sx={{ color: '#fff' }} />
        </Box>
      )}
      {error ? (
        <Box sx={{ m: 'auto', px: 3, textAlign: 'center', color: '#fff', maxWidth: 420 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Não foi possível exibir o PDF</Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            {error}
          </Typography>
        </Box>
      ) : (
        <Box
          ref={hostRef}
          sx={{
            flex: 1,
            overflow: 'auto',
            px: 2,
            py: 2,
            minHeight: 0,
          }}
        />
      )}
      {!loading && !error && pageCount > 0 && (
        <Typography
          variant="caption"
          sx={{
            flexShrink: 0,
            textAlign: 'center',
            py: 0.75,
            color: 'rgba(255,255,255,0.75)',
            bgcolor: 'rgba(0,0,0,0.25)',
          }}
        >
          {pageCount} {pageCount === 1 ? 'página' : 'páginas'}
        </Typography>
      )}
    </Box>
  )
}
