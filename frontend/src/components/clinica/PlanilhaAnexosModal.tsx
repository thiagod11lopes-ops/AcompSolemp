import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  alpha,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { useEffect, useState } from 'react'
import { useCloudAppDataSync } from '@/config/dataSource'
import { pedidoAnexoService } from '@/services/pedidoAnexoService'
import type { ArquivoAnexo } from '@/types'

interface PlanilhaAnexosModalProps {
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
    // Prefere entrada com caminho de storage ou conteúdo baixável.
    const prevScore = (prev.storagePath ? 2 : 0) + (prev.conteudoBase64 ? 1 : 0)
    const nextScore = (arquivo.storagePath ? 2 : 0) + (arquivo.conteudoBase64 ? 1 : 0)
    byId.set(arquivo.id, nextScore >= prevScore ? arquivo : prev)
  }
  return [...byId.values()].sort((a, b) => b.dataUpload.localeCompare(a.dataUpload))
}

export function PlanilhaAnexosModal({ open, pedidoId, onClose }: PlanilhaAnexosModalProps) {
  const cloudSync = useCloudAppDataSync()
  const [anexos, setAnexos] = useState<ArquivoAnexo[]>([])
  const [loading, setLoading] = useState(false)
  const [baixandoId, setBaixandoId] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !pedidoId) {
      setAnexos([])
      setLoading(false)
      return
    }

    let cancelled = false
    const locais = pedidoAnexoService.listByPedido(pedidoId)
    setAnexos(locais)
    setLoading(true)

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
      const atualizados = pedidoAnexoService.listByPedido(pedidoId)
      setAnexos(mergeAnexos(locais, atualizados))
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [open, pedidoId, cloudSync])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6, fontWeight: 800 }}>
        Arquivos anexados
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
          aria-label="Fechar"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading && anexos.length === 0 ? (
          <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : anexos.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center', opacity: 0.7 }}>
            <AttachFileIcon sx={{ fontSize: 36, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              Nenhum arquivo foi anexado nesta planilha.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Se o arquivo foi anexado agora, confira se a migration do Storage
              (`migration_planilha_anexos_storage.sql`) foi executada no Supabase.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.25}>
            {anexos.map((arquivo) => {
              const podeBaixar = Boolean(arquivo.conteudoBase64 || arquivo.storagePath)
              return (
                <Box
                  key={arquivo.id}
                  sx={(theme) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                  })}
                >
                  <AttachFileIcon color="primary" sx={{ flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, wordBreak: 'break-word' }}
                    >
                      {arquivo.nome}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatTamanho(arquivo.tamanhoKb)}
                      {!podeBaixar ? ' · conteúdo indisponível para download' : ''}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={
                      baixandoId === arquivo.id ? (
                        <CircularProgress size={14} color="inherit" />
                      ) : (
                        <DownloadIcon />
                      )
                    }
                    disabled={!podeBaixar || baixandoId === arquivo.id}
                    onClick={() => {
                      setBaixandoId(arquivo.id)
                      void pedidoAnexoService.download(arquivo).finally(() => {
                        setBaixandoId(null)
                      })
                    }}
                    sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
                  >
                    Download
                  </Button>
                </Box>
              )
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
