import {
  Box,
  Button,
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
import { useMemo } from 'react'
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

export function PlanilhaAnexosModal({ open, pedidoId, onClose }: PlanilhaAnexosModalProps) {
  const anexos = useMemo(() => {
    if (!open || !pedidoId) return [] as ArquivoAnexo[]
    return pedidoAnexoService.listByPedido(pedidoId)
  }, [open, pedidoId])

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
        {anexos.length === 0 ? (
          <Box sx={{ py: 3, textAlign: 'center', opacity: 0.7 }}>
            <AttachFileIcon sx={{ fontSize: 36, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              Nenhum arquivo foi anexado nesta planilha.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.25}>
            {anexos.map((arquivo) => {
              const podeBaixar = Boolean(arquivo.conteudoBase64)
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
                    startIcon={<DownloadIcon />}
                    disabled={!podeBaixar}
                    onClick={() => {
                      const ok = pedidoAnexoService.download(arquivo)
                      if (!ok) return
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
