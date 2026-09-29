import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import DescriptionIcon from '@mui/icons-material/Description'
import { useEffect, useState } from 'react'
import { useCloudAppDataSync } from '@/config/dataSource'
import { pedidoAnexoService } from '@/services/pedidoAnexoService'
import type { ArquivoAnexo } from '@/types'

interface DocumentoAnexoEscolherModalProps {
  open: boolean
  pedidoId: string
  onClose: () => void
  onEscolher: (arquivo: ArquivoAnexo) => void
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

/** Lista os anexos do pedido para o usuário escolher qual visualizar. */
export function DocumentoAnexoEscolherModal({
  open,
  pedidoId,
  onClose,
  onEscolher,
}: DocumentoAnexoEscolherModalProps) {
  const theme = useTheme()
  const cloudSync = useCloudAppDataSync()
  const [anexos, setAnexos] = useState<ArquivoAnexo[]>([])
  const [loading, setLoading] = useState(false)

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
        // Mantém dados locais.
      }
      if (cancelled) return
      setAnexos(mergeAnexos(locais, pedidoAnexoService.listByPedido(pedidoId)))
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [open, pedidoId, cloudSync])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(10px)',
            backgroundColor: alpha('#0b1220', 0.55),
          },
        },
        paper: {
          sx: {
            borderRadius: 5,
            overflow: 'hidden',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
            background: `
              radial-gradient(120% 80% at 0% 0%, ${alpha(theme.palette.primary.main, 0.16)} 0%, transparent 55%),
              radial-gradient(100% 70% at 100% 100%, ${alpha(theme.palette.secondary.main, 0.12)} 0%, transparent 50%),
              ${theme.palette.background.paper}
            `,
            boxShadow: `0 32px 100px ${alpha('#000', 0.35)}`,
          },
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 2,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(145deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              color: '#fff',
              boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.45)}`,
            }}
          >
            <DescriptionIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
              Anexos
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Escolher documento
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Fechar">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pb: 3, pt: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Selecione qual arquivo anexado deseja visualizar.
        </Typography>
        {loading && anexos.length === 0 ? (
          <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : anexos.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <AttachFileIcon sx={{ fontSize: 36, mb: 1, color: 'text.secondary', opacity: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              Nenhum arquivo foi anexado nesta planilha.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.25}>
            {anexos.map((arquivo) => (
              <Box
                key={arquivo.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  p: 1.5,
                  borderRadius: 2.5,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                }}
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
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<VisibilityOutlinedIcon />}
                  onClick={() => onEscolher(arquivo)}
                  sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
                >
                  Visualizar
                </Button>
              </Box>
            ))}
          </Stack>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button onClick={onClose} color="inherit" sx={{ fontWeight: 700 }}>
            Fechar
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
