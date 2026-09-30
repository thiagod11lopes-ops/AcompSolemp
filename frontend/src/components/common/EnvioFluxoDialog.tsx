import type { ReactNode } from 'react'
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  type DialogProps,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'

/** Botão primário de envio — mesmo visual do modal da clínica. */
export const ENVIO_FLUXO_SUBMIT_SX = {
  textTransform: 'none' as const,
  fontWeight: 700,
  borderRadius: '11px',
  px: 2,
  boxShadow: '0 6px 14px rgba(63, 107, 86, 0.22)',
  background: 'linear-gradient(135deg, #558b71 0%, #3f6b56 100%)',
  '&:hover': {
    background: 'linear-gradient(135deg, #61987d 0%, #4a7a63 100%)',
    boxShadow: '0 8px 18px rgba(63, 107, 86, 0.3)',
  },
  '&.Mui-disabled': {
    background: 'rgba(85, 139, 113, 0.2)',
    color: 'rgba(0,0,0,0.38)',
  },
}

export const ENVIO_FLUXO_CANCEL_SX = {
  textTransform: 'none' as const,
  fontWeight: 600,
  borderRadius: '11px',
}

export interface EnvioFluxoChip {
  label: string
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
}

interface EnvioFluxoDialogProps {
  open: boolean
  title: string
  onClose: () => void
  onSubmit: () => void
  /** Ação do botão secundário (padrão: onClose). */
  onCancel?: () => void
  loading?: boolean
  submitLabel?: string
  cancelLabel?: string
  loadingLabel?: string
  cancelLoadingLabel?: string
  submitDisabled?: boolean
  /** Esconde o ícone Send no botão (ex.: confirmar). */
  hideSubmitIcon?: boolean
  /** Ícone customizado do botão primário. */
  submitStartIcon?: ReactNode
  chips?: EnvioFluxoChip[]
  maxWidth?: DialogProps['maxWidth']
  /** Impede fechar no clique do backdrop (útil com seletor de arquivo). */
  blockBackdropClose?: boolean
  /** Impede fechar por backdrop ou Escape — só pelos botões. */
  preventDismiss?: boolean
  children: ReactNode
}

/**
 * Dialog leve e padronizado —
 * mesma aparência do modal "Enviar planilha" da clínica.
 */
export function EnvioFluxoDialog({
  open,
  title,
  onClose,
  onSubmit,
  onCancel,
  loading = false,
  submitLabel = 'Enviar planilha',
  cancelLabel = 'Cancelar',
  loadingLabel = 'Enviando...',
  cancelLoadingLabel,
  submitDisabled = false,
  hideSubmitIcon = false,
  submitStartIcon,
  chips,
  maxWidth = 'xs',
  blockBackdropClose = false,
  preventDismiss = false,
  children,
}: EnvioFluxoDialogProps) {
  const handleCancel = onCancel ?? onClose

  return (
    <Dialog
      open={open}
      onClose={
        loading || preventDismiss
          ? (_event, reason) => {
              if (preventDismiss) return
              if (blockBackdropClose && reason === 'backdropClick') return
            }
          : (_event, reason) => {
              if (blockBackdropClose && reason === 'backdropClick') return
              onClose()
            }
      }
      disableRestoreFocus
      maxWidth={maxWidth}
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>{title}</DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        {chips && chips.length > 0 && (
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}
          >
            {chips.map((chip) => (
              <Chip
                key={chip.label}
                size="small"
                color={chip.color ?? 'primary'}
                variant="outlined"
                label={chip.label}
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Stack>
        )}
        {children}
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
        <Button
          onClick={handleCancel}
          disabled={loading}
          color="inherit"
          sx={ENVIO_FLUXO_CANCEL_SX}
        >
          {loading && cancelLoadingLabel ? cancelLoadingLabel : cancelLabel}
        </Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={loading || submitDisabled}
          startIcon={
            hideSubmitIcon ? undefined : (submitStartIcon ?? <SendIcon />)
          }
          sx={ENVIO_FLUXO_SUBMIT_SX}
        >
          {loading && !cancelLoadingLabel ? loadingLabel : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
