import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Typography,
  alpha,
} from '@mui/material'
import type { ReactNode } from 'react'
import { premiumTokens } from '@/theme/tokens'

export const planilhaEditFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 1.5,
    bgcolor: alpha('#0f172a', 0.02),
    fontSize: '0.8rem',
    transition: 'background-color 160ms ease, box-shadow 160ms ease',
    '&:hover': {
      bgcolor: alpha(premiumTokens.primary, 0.04),
    },
    '&.Mui-focused': {
      bgcolor: '#fff',
      boxShadow: `0 0 0 2px ${alpha(premiumTokens.primary, 0.16)}`,
    },
    '& fieldset': {
      borderColor: alpha('#0f172a', 0.12),
    },
    '&:hover fieldset': {
      borderColor: alpha(premiumTokens.primary, 0.45),
    },
    '&.Mui-focused fieldset': {
      borderColor: premiumTokens.primary,
      borderWidth: 1.5,
    },
  },
  '& .MuiInputBase-input': {
    fontSize: '0.8rem',
    py: 0.7,
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.8rem',
  },
  '& .MuiFormHelperText-root': {
    fontSize: '0.68rem',
    mx: 0.25,
    mt: 0.25,
    mb: 0,
  },
} as const

export const planilhaEditMultilineSx = {
  ...planilhaEditFieldSx,
  gridColumn: '1 / -1',
  '& .MuiOutlinedInput-root': {
    ...planilhaEditFieldSx['& .MuiOutlinedInput-root'],
    alignItems: 'flex-start',
  },
  '& .MuiInputBase-input': {
    fontSize: '0.8rem',
    lineHeight: 1.35,
    py: 0.7,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  },
} as const

interface PlanilhaEditSectionProps {
  title: string
  children: ReactNode
  /** Colunas do grid interno (sm+). */
  columns?: 2 | 3 | 4
}

/** Bloco compacto de campos agrupados no modal de edição. */
export function PlanilhaEditSection({
  title,
  children,
  columns = 3,
}: PlanilhaEditSectionProps) {
  return (
    <Box
      sx={{
        borderRadius: 2,
        border: `1px solid ${alpha('#0f172a', 0.08)}`,
        bgcolor: alpha('#fff', 0.85),
        px: 1.25,
        py: 1,
        display: 'grid',
        gap: 0.85,
      }}
    >
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '0.68rem',
          letterSpacing: 0.45,
          textTransform: 'uppercase',
          color: premiumTokens.primaryDark,
          lineHeight: 1.1,
        }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 0.85,
          gridTemplateColumns: {
            xs: '1fr',
            sm: columns === 2 ? '1fr 1fr' : columns === 4 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
          },
        }}
      >
        {children}
      </Box>
    </Box>
  )
}

interface PlanilhaLinhaEditDialogProps {
  open: boolean
  title: string
  badge?: string
  onClose: () => void
  onSave: () => void
  saveLabel?: string
  children: ReactNode
}

/**
 * Modal compacto para editar lançamentos — todos os campos visíveis sem rolagem.
 */
export function PlanilhaLinhaEditDialog({
  open,
  title,
  badge = 'Edição',
  onClose,
  onSave,
  saveLabel = 'Salvar lançamento',
  children,
}: PlanilhaLinhaEditDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      scroll="body"
      sx={{ zIndex: (t) => t.zIndex.modal + 20 }}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: alpha('#0f172a', 0.4),
            backdropFilter: 'blur(3px)',
          },
        },
        paper: {
          sx: {
            borderRadius: 2.5,
            overflow: 'hidden',
            width: { xs: '96vw', md: 'min(1100px, 94vw)' },
            maxWidth: '1100px',
            // Evita barra de rolagem: o conteúdo cabe na viewport
            maxHeight: 'none',
            border: `1px solid ${alpha('#0f172a', 0.08)}`,
            boxShadow: `0 24px 64px ${alpha('#0f172a', 0.24)}`,
            background: `linear-gradient(180deg, ${alpha(premiumTokens.primary, 0.06)} 0%, #fff 72px)`,
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.25,
          px: { xs: 1.75, sm: 2.25 },
          py: 1.25,
          borderBottom: `1px solid ${alpha('#0f172a', 0.06)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Chip
            size="small"
            label={badge}
            sx={{
              height: 22,
              fontWeight: 700,
              fontSize: '0.65rem',
              letterSpacing: 0.3,
              color: premiumTokens.primaryDark,
              bgcolor: alpha(premiumTokens.primary, 0.14),
              border: `1px solid ${alpha(premiumTokens.primary, 0.22)}`,
            }}
          />
          <Typography
            component="h2"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1rem', sm: '1.1rem' },
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              color: '#0f172a',
            }}
          >
            {title}
          </Typography>
        </Box>
        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          size="small"
          sx={{
            color: 'text.secondary',
            bgcolor: alpha('#0f172a', 0.04),
            '&:hover': { bgcolor: alpha('#0f172a', 0.08) },
          }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent
        sx={{
          px: { xs: 1.75, sm: 2.25 },
          py: 1.25,
          overflow: 'visible',
          bgcolor: alpha('#f8fafc', 0.55),
          display: 'grid',
          gap: 1,
        }}
      >
        {children}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 1.75, sm: 2.25 },
          py: 1.15,
          gap: 1,
          bgcolor: '#fff',
          borderTop: `1px solid ${alpha('#0f172a', 0.06)}`,
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            color: 'text.secondary',
            px: 1.5,
            minHeight: 34,
          }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            px: 2,
            minHeight: 34,
            borderRadius: 1.5,
            bgcolor: premiumTokens.primary,
            boxShadow: `0 6px 16px ${alpha(premiumTokens.primary, 0.25)}`,
            '&:hover': {
              bgcolor: premiumTokens.primaryDark,
            },
          }}
        >
          {saveLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
