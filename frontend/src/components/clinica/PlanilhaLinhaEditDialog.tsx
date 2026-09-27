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
    borderRadius: 2,
    bgcolor: alpha('#0f172a', 0.02),
    fontSize: '0.875rem',
    transition: 'background-color 160ms ease, box-shadow 160ms ease',
    '&:hover': {
      bgcolor: alpha(premiumTokens.primary, 0.04),
    },
    '&.Mui-focused': {
      bgcolor: '#fff',
      boxShadow: `0 0 0 3px ${alpha(premiumTokens.primary, 0.18)}`,
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
    fontSize: '0.875rem',
    py: 1.05,
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.875rem',
  },
  '& .MuiFormHelperText-root': {
    fontSize: '0.72rem',
    mx: 0.25,
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
    fontSize: '0.875rem',
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  },
} as const

interface PlanilhaEditSectionProps {
  title: string
  subtitle?: string
  children: ReactNode
}

/** Bloco visual de campos agrupados no modal de edição. */
export function PlanilhaEditSection({ title, subtitle, children }: PlanilhaEditSectionProps) {
  return (
    <Box
      sx={{
        borderRadius: 2.5,
        border: `1px solid ${alpha('#0f172a', 0.08)}`,
        bgcolor: alpha('#fff', 0.72),
        p: { xs: 1.5, sm: 2 },
        display: 'grid',
        gap: 1.25,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '0.78rem',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            color: premiumTokens.primaryDark,
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography
            sx={{
              mt: 0.35,
              fontSize: '0.78rem',
              color: 'text.secondary',
              lineHeight: 1.35,
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
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
  subtitle?: string
  badge?: string
  onClose: () => void
  onSave: () => void
  saveLabel?: string
  children: ReactNode
}

/**
 * Modal moderno para editar lançamentos das planilhas IMH / Div. Material.
 */
export function PlanilhaLinhaEditDialog({
  open,
  title,
  subtitle = 'Altere o lançamento selecionado. A planilha atualiza ao vivo.',
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
      maxWidth="md"
      scroll="paper"
      sx={{ zIndex: (t) => t.zIndex.modal + 20 }}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: alpha('#0f172a', 0.45),
            backdropFilter: 'blur(4px)',
          },
        },
        paper: {
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            maxHeight: { xs: '94vh', sm: '90vh' },
            border: `1px solid ${alpha('#0f172a', 0.08)}`,
            boxShadow: `0 28px 80px ${alpha('#0f172a', 0.28)}`,
            background: `linear-gradient(180deg, ${alpha(premiumTokens.primary, 0.07)} 0%, #fff 120px)`,
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1.5,
          px: { xs: 2, sm: 2.75 },
          pt: 2.25,
          pb: 1.5,
        }}
      >
        <Box sx={{ minWidth: 0, display: 'grid', gap: 0.75 }}>
          <Chip
            size="small"
            label={badge}
            sx={{
              width: 'fit-content',
              height: 24,
              fontWeight: 700,
              fontSize: '0.7rem',
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
              fontSize: { xs: '1.15rem', sm: '1.3rem' },
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              color: '#0f172a',
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.875rem',
              color: 'text.secondary',
              lineHeight: 1.45,
              maxWidth: 520,
            }}
          >
            {subtitle}
          </Typography>
        </Box>
        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          size="small"
          sx={{
            mt: 0.25,
            color: 'text.secondary',
            bgcolor: alpha('#0f172a', 0.04),
            '&:hover': { bgcolor: alpha('#0f172a', 0.08) },
          }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent
        dividers
        sx={{
          px: { xs: 2, sm: 2.75 },
          py: 2,
          borderColor: alpha('#0f172a', 0.06),
          bgcolor: alpha('#f8fafc', 0.65),
          display: 'grid',
          gap: 1.5,
        }}
      >
        {children}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 2.75 },
          py: 1.75,
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
            px: 1.75,
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
            px: 2.25,
            borderRadius: 2,
            bgcolor: premiumTokens.primary,
            boxShadow: `0 8px 20px ${alpha(premiumTokens.primary, 0.28)}`,
            '&:hover': {
              bgcolor: premiumTokens.primaryDark,
              boxShadow: `0 10px 24px ${alpha(premiumTokens.primary, 0.34)}`,
            },
          }}
        >
          {saveLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
