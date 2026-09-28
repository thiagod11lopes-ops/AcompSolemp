import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  IconButton,
  Stack,
  Typography,
  alpha,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { useEffect, useMemo, useState } from 'react'
import { useCloudAppDataSync } from '@/config/dataSource'
import { pedidoAnexoService } from '@/services/pedidoAnexoService'
import type { ArquivoAnexo } from '@/types'

interface DocumentoAnexoPreviewModalProps {
  open: boolean
  pedidoId: string
  onClose: () => void
}

function formatTamanho(kb: number): string {
  if (kb < 1024) return `${kb} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function mergeAnexos(local: ArquivoAnexo[], remote: ArquivoAnexo[]): ArquivoAnexo[] {
  const byId = new Map<string, ArquivoAnexo>()
  for (const arquivo of [...local, ...remote]) {
    const prev = byId.get(arquivo.id)
    if (!prev) {
      byId.set(arquivo.id, arquivo)
      continue
    }
    const prevScore = (prev.storagePath ? 2 : 0) + (prev.conteudoBase64 ? 1 : 0)
    const nextScore = (arquivo.storagePath ? 2 : 0) + (arquivo.conteudoBase64 ? 1 : 0)
    byId.set(arquivo.id, nextScore >= prevScore ? arquivo : prev)
  }
  return [...byId.values()].sort((a, b) => b.dataUpload.localeCompare(a.dataUpload))
}

function mimeOf(arquivo: ArquivoAnexo): string {
  if (arquivo.mimeType && arquivo.mimeType !== 'application/octet-stream') {
    return arquivo.mimeType
  }
  const lower = arquivo.nome.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.txt') || lower.endsWith('.md')) return 'text/plain'
  if (lower.endsWith('.csv')) return 'text/csv'
  if (lower.endsWith('.json')) return 'application/json'
  return arquivo.mimeType || 'application/octet-stream'
}

type PreviewKind = 'pdf' | 'image' | 'text' | 'unsupported'

function previewKind(mime: string): PreviewKind {
  if (mime === 'application/pdf' || mime.includes('pdf')) return 'pdf'
  if (mime.startsWith('image/')) return 'image'
  if (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/xml'
  ) {
    return 'text'
  }
  return 'unsupported'
}

export function DocumentoAnexoPreviewModal({
  open,
  pedidoId,
  onClose,
}: DocumentoAnexoPreviewModalProps) {
  const cloudSync = useCloudAppDataSync()
  const [anexos, setAnexos] = useState<ArquivoAnexo[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)
  const [contentError, setContentError] = useState<string | null>(null)
  const [baixando, setBaixando] = useState(false)

  const selected = useMemo(
    () => anexos.find((a) => a.id === selectedId) ?? anexos[0] ?? null,
    [anexos, selectedId],
  )
  const kind = selected ? previewKind(mimeOf(selected)) : null

  useEffect(() => {
    if (!open || !pedidoId) {
      setAnexos([])
      setSelectedId(null)
      setLoadingList(false)
      return
    }

    let cancelled = false
    const locais = pedidoAnexoService.listByPedido(pedidoId)
    setAnexos(locais)
    setSelectedId(locais[0]?.id ?? null)
    setLoadingList(true)

    void (async () => {
      try {
        if (cloudSync) {
          const { refreshAppDataFromCloud } = await import('@/data/persistence/supabaseSync')
          const { applyRemoteAppData } = await import('@/mocks/seed')
          const remote = await refreshAppDataFromCloud()
          if (remote) applyRemoteAppData(remote)
        }
      } catch {
        // Mantém dados locais se o refresh falhar.
      }
      if (cancelled) return
      const atualizados = mergeAnexos(locais, pedidoAnexoService.listByPedido(pedidoId))
      setAnexos(atualizados)
      setSelectedId((prev) => {
        if (prev && atualizados.some((a) => a.id === prev)) return prev
        return atualizados[0]?.id ?? null
      })
      setLoadingList(false)
    })()

    return () => {
      cancelled = true
    }
  }, [open, pedidoId, cloudSync])

  useEffect(() => {
    if (!open || !selected) {
      setObjectUrl(null)
      setTextContent(null)
      setContentError(null)
      setLoadingContent(false)
      return
    }

    let cancelled = false
    let urlToRevoke: string | null = null
    setLoadingContent(true)
    setContentError(null)
    setObjectUrl(null)
    setTextContent(null)

    void (async () => {
      const blob = await pedidoAnexoService.resolveBlob(selected)
      if (cancelled) return
      if (!blob) {
        setContentError('Conteúdo indisponível para visualização.')
        setLoadingContent(false)
        return
      }

      const mime = mimeOf(selected)
      const typed =
        blob.type && blob.type !== 'application/octet-stream'
          ? blob
          : new Blob([blob], { type: mime })
      const k = previewKind(mime)

      if (k === 'text') {
        try {
          const text = await typed.text()
          if (cancelled) return
          setTextContent(text)
        } catch {
          if (!cancelled) setContentError('Não foi possível ler o texto do arquivo.')
        }
      } else if (k === 'pdf' || k === 'image') {
        urlToRevoke = URL.createObjectURL(typed)
        setObjectUrl(urlToRevoke)
      }
      // unsupported: sem object URL — mostra aviso + download
      if (!cancelled) setLoadingContent(false)
    })()

    return () => {
      cancelled = true
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke)
    }
  }, [open, selected])

  // Revoga URL ao trocar/fechar (cleanup do effect anterior só cobre o ciclo do próprio effect).
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      sx={{ zIndex: (t) => t.zIndex.modal + 20 }}
      slotProps={{
        paper: {
          sx: {
            m: 0,
            maxWidth: '100%',
            width: '100%',
            height: '100%',
            maxHeight: '100%',
            borderRadius: 0,
            bgcolor: '#0f1419',
            color: '#f5f7fa',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.25,
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          flexShrink: 0,
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            Visualizar documento
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {selected
              ? `${selected.nome} · ${formatTamanho(selected.tamanhoKb)}`
              : 'Conteúdo anexado à planilha'}
          </Typography>
        </Box>
        {selected && (
          <Button
            size="small"
            variant="outlined"
            startIcon={
              baixando ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />
            }
            disabled={baixando || !(selected.conteudoBase64 || selected.storagePath)}
            onClick={() => {
              setBaixando(true)
              void pedidoAnexoService.download(selected).finally(() => setBaixando(false))
            }}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.35)',
              '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
            }}
          >
            Baixar
          </Button>
        )}
        <IconButton onClick={onClose} aria-label="Fechar" sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {anexos.length > 1 && (
          <Stack
            spacing={0.75}
            sx={{
              width: { xs: 140, sm: 220 },
              flexShrink: 0,
              p: 1.25,
              borderRight: '1px solid rgba(255,255,255,0.1)',
              overflow: 'auto',
            }}
          >
            {anexos.map((arquivo) => {
              const active = arquivo.id === selected?.id
              return (
                <Box
                  key={arquivo.id}
                  component="button"
                  type="button"
                  onClick={() => setSelectedId(arquivo.id)}
                  sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    p: 1.1,
                    borderRadius: 1.5,
                    bgcolor: active ? 'rgba(66,133,244,0.22)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(66,133,244,0.55)' : 'transparent'}`,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                  }}
                >
                  <AttachFileIcon sx={{ fontSize: 18, mt: 0.15, opacity: 0.85 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        fontWeight: 700,
                        wordBreak: 'break-word',
                        lineHeight: 1.25,
                      }}
                    >
                      {arquivo.nome}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.55 }}>
                      {formatTamanho(arquivo.tamanhoKb)}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Stack>
        )}

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            position: 'relative',
            display: 'grid',
            placeItems: 'center',
            bgcolor: '#111820',
          }}
        >
          {loadingList && anexos.length === 0 ? (
            <CircularProgress sx={{ color: '#fff' }} />
          ) : anexos.length === 0 ? (
            <Box sx={{ textAlign: 'center', px: 3, opacity: 0.75 }}>
              <AttachFileIcon sx={{ fontSize: 42, mb: 1, opacity: 0.5 }} />
              <Typography>Nenhum arquivo anexado nesta planilha.</Typography>
            </Box>
          ) : loadingContent ? (
            <CircularProgress sx={{ color: '#fff' }} />
          ) : contentError ? (
            <Typography color="error">{contentError}</Typography>
          ) : kind === 'pdf' && objectUrl ? (
            <Box
              component="iframe"
              title={selected?.nome ?? 'Documento PDF'}
              src={objectUrl}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 0,
                bgcolor: '#525659',
              }}
            />
          ) : kind === 'image' && objectUrl ? (
            <Box
              component="img"
              src={objectUrl}
              alt={selected?.nome ?? 'Imagem'}
              sx={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                p: 2,
              }}
            />
          ) : kind === 'text' && textContent !== null ? (
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 3,
                width: '100%',
                height: '100%',
                overflow: 'auto',
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: alpha('#fff', 0.92),
              }}
            >
              {textContent}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', px: 3, maxWidth: 420 }}>
              <Typography sx={{ mb: 1.5, fontWeight: 700 }}>
                Visualização embutida indisponível para este formato
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7, mb: 2 }}>
                PDFs, imagens e textos abrem aqui. Planilhas e documentos do Office podem
                ser baixados para abrir no aplicativo correspondente.
              </Typography>
              {selected && (
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  disabled={baixando || !(selected.conteudoBase64 || selected.storagePath)}
                  onClick={() => {
                    setBaixando(true)
                    void pedidoAnexoService.download(selected).finally(() => setBaixando(false))
                  }}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Baixar arquivo
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Dialog>
  )
}
