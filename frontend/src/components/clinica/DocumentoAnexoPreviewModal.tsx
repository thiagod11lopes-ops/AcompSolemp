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
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import { PdfBlobViewer } from '@/components/clinica/PdfBlobViewer'
import { pedidoAnexoService } from '@/services/pedidoAnexoService'
import {
  parseSpreadsheetSheetsFile,
  type SpreadsheetSheetImport,
} from '@/utils/consumoMaterialOds'
import type { ArquivoAnexo } from '@/types'

interface DocumentoAnexoPreviewModalProps {
  open: boolean
  pedidoId: string
  onClose: () => void
  /** Quando informado, abre direto neste anexo (após escolha no modal). */
  initialArquivoId?: string | null
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
  if (lower.endsWith('.xlsx'))
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel'
  if (lower.endsWith('.ods')) return 'application/vnd.oasis.opendocument.spreadsheet'
  return arquivo.mimeType || 'application/octet-stream'
}

type PreviewKind = 'pdf' | 'image' | 'text' | 'spreadsheet' | 'unsupported'

function previewKind(arquivo: ArquivoAnexo): PreviewKind {
  const lower = arquivo.nome.toLowerCase()
  // Extensão manda — MIME do storage às vezes vem genérico/errado.
  if (lower.endsWith('.pdf')) return 'pdf'
  // Parser interno cobre OOXML (.xlsx) e ODS; .xls binário antigo não.
  if (lower.endsWith('.xlsx') || lower.endsWith('.ods')) return 'spreadsheet'
  if (lower.endsWith('.xls')) return 'unsupported'

  const mime = mimeOf(arquivo)
  if (mime === 'application/pdf' || mime.includes('pdf')) return 'pdf'
  if (mime.startsWith('image/')) return 'image'
  if (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/xml'
  ) {
    return 'text'
  }
  if (
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.oasis.opendocument.spreadsheet'
  ) {
    return 'spreadsheet'
  }
  return 'unsupported'
}

const MAX_PREVIEW_ROWS = 800
const MAX_PREVIEW_COLS = 60

function trimSheetRows(rows: string[][]): string[][] {
  if (rows.length === 0) return rows
  const limited = rows.slice(0, MAX_PREVIEW_ROWS).map((row) => row.slice(0, MAX_PREVIEW_COLS))
  // Remove linhas finais totalmente vazias para não alongar o scroll.
  let last = limited.length - 1
  while (last >= 0 && limited[last].every((cell) => !String(cell ?? '').trim())) {
    last -= 1
  }
  return limited.slice(0, last + 1)
}

export function DocumentoAnexoPreviewModal({
  open,
  pedidoId,
  onClose,
  initialArquivoId = null,
}: DocumentoAnexoPreviewModalProps) {
  const cloudSync = useCloudAppDataSync()
  const [anexos, setAnexos] = useState<ArquivoAnexo[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [sheets, setSheets] = useState<SpreadsheetSheetImport[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [loadingContent, setLoadingContent] = useState(false)
  const [contentError, setContentError] = useState<string | null>(null)
  const [baixando, setBaixando] = useState(false)

  const selected = useMemo(
    () => anexos.find((a) => a.id === selectedId) ?? anexos[0] ?? null,
    [anexos, selectedId],
  )
  const kind = selected ? previewKind(selected) : null
  const activeSheet = sheets[sheetIndex] ?? sheets[0] ?? null
  const previewRows = useMemo(
    () => (activeSheet ? trimSheetRows(activeSheet.rows) : []),
    [activeSheet],
  )
  const colCount = useMemo(() => {
    let max = 0
    for (const row of previewRows) max = Math.max(max, row.length)
    return Math.max(max, 1)
  }, [previewRows])

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
    setSelectedId(
      initialArquivoId && locais.some((a) => a.id === initialArquivoId)
        ? initialArquivoId
        : (locais[0]?.id ?? null),
    )
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
        if (initialArquivoId && atualizados.some((a) => a.id === initialArquivoId)) {
          return initialArquivoId
        }
        if (prev && atualizados.some((a) => a.id === prev)) return prev
        return atualizados[0]?.id ?? null
      })
      setLoadingList(false)
    })()

    return () => {
      cancelled = true
    }
  }, [open, pedidoId, cloudSync, initialArquivoId])

  useEffect(() => {
    if (!open || !selected) {
      setObjectUrl(null)
      setPdfBlob(null)
      setTextContent(null)
      setSheets([])
      setSheetIndex(0)
      setContentError(null)
      setLoadingContent(false)
      return
    }

    let cancelled = false
    let createdUrl: string | null = null
    setLoadingContent(true)
    setContentError(null)
    setObjectUrl(null)
    setPdfBlob(null)
    setTextContent(null)
    setSheets([])
    setSheetIndex(0)

    void (async () => {
      const blob = await pedidoAnexoService.resolveBlob(selected)
      if (cancelled) return
      if (!blob) {
        setContentError('Conteúdo indisponível para visualização.')
        setLoadingContent(false)
        return
      }

      const mime = mimeOf(selected)
      const k = previewKind(selected)
      // Força MIME correto: blob do Storage às vezes vem como octet-stream e o
      // viewer nativo do Chrome só mostra o botão "Abrir" (que não funciona no modal).
      const typed =
        k === 'pdf'
          ? new Blob([blob], { type: 'application/pdf' })
          : blob.type && blob.type !== 'application/octet-stream'
            ? blob
            : new Blob([blob], { type: mime })

      try {
        if (k === 'text') {
          const text = await typed.text()
          if (cancelled) return
          setTextContent(text)
        } else if (k === 'pdf') {
          if (cancelled) return
          setPdfBlob(typed)
        } else if (k === 'image') {
          createdUrl = URL.createObjectURL(typed)
          if (cancelled) {
            URL.revokeObjectURL(createdUrl)
            return
          }
          setObjectUrl(createdUrl)
        } else if (k === 'spreadsheet') {
          const file = new File([typed], selected.nome, { type: mime })
          const parsed = await parseSpreadsheetSheetsFile(file)
          if (cancelled) return
          if (parsed.length === 0) {
            setContentError('Nenhuma aba com dados encontrada na planilha.')
          } else {
            setSheets(parsed)
            setSheetIndex(0)
          }
        }
      } catch (error) {
        if (!cancelled) {
          setContentError(
            error instanceof Error
              ? error.message
              : 'Não foi possível abrir o arquivo para visualização.',
          )
        }
      }

      if (!cancelled) setLoadingContent(false)
    })()

    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [open, selected])

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
      // Sem transição/transform: o viewer nativo de PDF do Chrome quebra com transform no ancestral.
      transitionDuration={0}
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
            transform: 'none !important',
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
            bgcolor: kind === 'spreadsheet' ? EXCEL_SHEET.sheetBg : '#111820',
            overflow: 'hidden',
          }}
        >
          {loadingList && anexos.length === 0 ? (
            <CircularProgress sx={{ color: kind === 'spreadsheet' ? EXCEL_SHEET.text : '#fff' }} />
          ) : anexos.length === 0 ? (
            <Box sx={{ textAlign: 'center', px: 3, opacity: 0.75, color: '#fff' }}>
              <AttachFileIcon sx={{ fontSize: 42, mb: 1, opacity: 0.5 }} />
              <Typography>Nenhum arquivo anexado nesta planilha.</Typography>
            </Box>
          ) : loadingContent ? (
            <CircularProgress sx={{ color: kind === 'spreadsheet' ? EXCEL_SHEET.text : '#fff' }} />
          ) : contentError ? (
            <Typography color="error" sx={{ px: 3, textAlign: 'center' }}>
              {contentError}
            </Typography>
          ) : kind === 'pdf' && pdfBlob ? (
            <PdfBlobViewer blob={pdfBlob} fileName={selected?.nome} />
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
          ) : kind === 'spreadsheet' && activeSheet ? (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: EXCEL_SHEET.sheetBg,
                color: EXCEL_SHEET.text,
              }}
            >
              {sheets.length > 1 && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{
                    px: 1,
                    pt: 1,
                    pb: 0.75,
                    flexShrink: 0,
                    overflowX: 'auto',
                    bgcolor: EXCEL_SHEET.toolbarBg,
                    borderBottom: `1px solid ${EXCEL_SHEET.toolbarBorder}`,
                  }}
                >
                  {sheets.map((sheet, index) => {
                    const active = index === sheetIndex
                    return (
                      <Button
                        key={`${sheet.nome}-${index}`}
                        size="small"
                        onClick={() => setSheetIndex(index)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: active ? 800 : 600,
                          minWidth: 'auto',
                          px: 1.5,
                          py: 0.4,
                          borderRadius: '6px 6px 0 0',
                          bgcolor: active ? EXCEL_SHEET.cellBg : 'transparent',
                          color: EXCEL_SHEET.text,
                          border: active
                            ? `1px solid ${EXCEL_SHEET.toolbarBorder}`
                            : '1px solid transparent',
                          borderBottom: active
                            ? `1px solid ${EXCEL_SHEET.cellBg}`
                            : '1px solid transparent',
                          boxShadow: 'none',
                        }}
                      >
                        {sheet.nome}
                      </Button>
                    )
                  })}
                </Stack>
              )}
              <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <Box
                  component="table"
                  sx={{
                    borderCollapse: 'collapse',
                    width: 'max-content',
                    minWidth: '100%',
                    fontFamily: EXCEL_SHEET.fontFamily,
                    fontSize: EXCEL_SHEET.fontSize,
                    lineHeight: EXCEL_SHEET.lineHeight,
                  }}
                >
                  <Box component="tbody">
                    {previewRows.length === 0 ? (
                      <Box component="tr">
                        <Box
                          component="td"
                          sx={{
                            p: 3,
                            color: EXCEL_SHEET.mutedText,
                            border: EXCEL_SHEET.border,
                          }}
                        >
                          Aba sem células preenchidas.
                        </Box>
                      </Box>
                    ) : (
                      previewRows.map((row, rowIndex) => (
                        <Box component="tr" key={`r-${rowIndex}`}>
                          {Array.from({ length: colCount }, (_, colIndex) => {
                            const value = row[colIndex] ?? ''
                            const isHeader = rowIndex === 0
                            return (
                              <Box
                                component="td"
                                key={`c-${rowIndex}-${colIndex}`}
                                sx={{
                                  border: EXCEL_SHEET.border,
                                  px: 1,
                                  py: 0.55,
                                  minWidth: 72,
                                  maxWidth: 320,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  verticalAlign: 'top',
                                  bgcolor: isHeader
                                    ? EXCEL_SHEET.headerBg
                                    : rowIndex % 2 === 0
                                      ? EXCEL_SHEET.cellBg
                                      : EXCEL_SHEET.emptyRowBg,
                                  fontWeight: isHeader
                                    ? EXCEL_SHEET.fontWeightBold
                                    : EXCEL_SHEET.fontWeight,
                                  color: EXCEL_SHEET.text,
                                }}
                              >
                                {value}
                              </Box>
                            )
                          })}
                        </Box>
                      ))
                    )}
                  </Box>
                </Box>
                {(activeSheet.rows.length > MAX_PREVIEW_ROWS ||
                  activeSheet.rows.some((r) => r.length > MAX_PREVIEW_COLS)) && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      px: 1.5,
                      py: 1,
                      color: EXCEL_SHEET.mutedText,
                      bgcolor: EXCEL_SHEET.toolbarBg,
                      borderTop: `1px solid ${EXCEL_SHEET.toolbarBorder}`,
                    }}
                  >
                    Exibindo até {MAX_PREVIEW_ROWS} linhas e {MAX_PREVIEW_COLS} colunas. Baixe o
                    arquivo para ver o conteúdo completo.
                  </Typography>
                )}
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', px: 3, maxWidth: 420, color: '#fff' }}>
              <Typography sx={{ mb: 1.5, fontWeight: 700 }}>
                Visualização embutida indisponível para este formato
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7, mb: 2 }}>
                PDFs, imagens, textos e planilhas (.xlsx / .ods) abrem aqui. Outros formatos do
                Office podem ser baixados para abrir no aplicativo correspondente.
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
