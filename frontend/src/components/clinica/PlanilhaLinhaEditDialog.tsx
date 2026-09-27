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
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import { premiumTokens } from '@/theme/tokens'

export const planilhaEditFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 1.25,
    bgcolor: alpha('#0f172a', 0.02),
    fontSize: '0.78rem',
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
    fontSize: '0.78rem',
    py: 0.55,
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.78rem',
  },
  '& .MuiFormHelperText-root': {
    fontSize: '0.65rem',
    mx: 0.25,
    mt: 0.15,
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
    fontSize: '0.78rem',
    lineHeight: 1.3,
    py: 0.55,
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
        borderRadius: 1.5,
        border: `1px solid ${alpha('#0f172a', 0.08)}`,
        bgcolor: alpha('#fff', 0.85),
        px: 1,
        py: 0.65,
        display: 'grid',
        gap: 0.55,
      }}
    >
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '0.62rem',
          letterSpacing: 0.4,
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
          gap: 0.65,
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
  /**
   * Com a planilha expandida: modal ancorado embaixo (linha editada fica
   * visível no topo, sem blur).
   */
  dockBelowRow?: boolean
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
  dockBelowRow = false,
}: PlanilhaLinhaEditDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      scroll="body"
      hideBackdrop={false}
      sx={{
        zIndex: (t) => t.zIndex.modal + 20,
        ...(dockBelowRow
          ? {
              '& .MuiDialog-container': {
                alignItems: 'flex-end',
                justifyContent: 'center',
                pt: 0,
                pb: { xs: 0.75, sm: 1 },
                px: { xs: 1, sm: 2 },
              },
            }
          : {
              '& .MuiDialog-container': {
                alignItems: 'center',
              },
            }),
      }}
      slotProps={{
        backdrop: {
          sx: dockBelowRow
            ? {
                bgcolor: 'transparent',
                backdropFilter: 'none',
                backgroundImage: `linear-gradient(
                  to bottom,
                  transparent 0%,
                  transparent 36%,
                  ${alpha('#0f172a', 0.1)} 50%,
                  ${alpha('#0f172a', 0.26)} 100%
                )`,
              }
            : {
                bgcolor: alpha('#0f172a', 0.4),
                backdropFilter: 'blur(3px)',
              },
        },
        paper: {
          sx: {
            borderRadius: dockBelowRow ? 2 : 2.5,
            overflow: 'hidden',
            width: { xs: '96vw', md: 'min(1100px, 94vw)' },
            maxWidth: '1100px',
            // Altura suficiente para IMH e Div. Material sem barra de rolagem interna
            maxHeight: dockBelowRow
              ? { xs: '72vh', sm: 'min(68vh, 620px)' }
              : { xs: '94vh', sm: 'min(90vh, 720px)' },
            m: dockBelowRow ? 0 : undefined,
            display: 'flex',
            flexDirection: 'column',
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
          px: { xs: 1.5, sm: 2 },
          py: 0.85,
          flexShrink: 0,
          bgcolor: EXCEL_SHEET.editingBg,
          borderBottom: `1px solid ${alpha(EXCEL_SHEET.selectedCheck, 0.28)}`,
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
              color: EXCEL_SHEET.selectedCheck,
              bgcolor: alpha('#fff', 0.55),
              border: `1px solid ${alpha(EXCEL_SHEET.selectedCheck, 0.35)}`,
            }}
          />
          <Typography
            component="h2"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '0.95rem', sm: '1.05rem' },
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
            color: EXCEL_SHEET.selectedCheck,
            bgcolor: alpha('#fff', 0.45),
            '&:hover': { bgcolor: alpha('#fff', 0.7) },
          }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent
        sx={{
          px: { xs: 1.25, sm: 1.75 },
          py: 0.85,
          // Sem rolagem: o conteúdo cabe na altura do paper
          overflow: 'visible',
          flex: '1 1 auto',
          minHeight: 0,
          bgcolor: alpha('#f8fafc', 0.55),
          display: 'grid',
          gap: 0.65,
        }}
      >
        {children}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 0.85,
          gap: 1,
          flexShrink: 0,
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
            minHeight: 32,
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
            minHeight: 32,
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
