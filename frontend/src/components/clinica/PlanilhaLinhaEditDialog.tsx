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
import { useLayoutEffect, useState, type ReactNode } from 'react'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import { premiumTokens } from '@/theme/tokens'

export const planilhaEditFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 1.25,
    bgcolor: alpha('#0f172a', 0.02),
    fontSize: '0.84rem',
    minHeight: 42,
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
    fontSize: '0.84rem',
    py: 1.05,
    lineHeight: 1.35,
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.84rem',
  },
  '& .MuiFormHelperText-root': {
    fontSize: '0.7rem',
    mx: 0.25,
    mt: 0.35,
    mb: 0,
  },
} as const

export const planilhaEditMultilineSx = {
  ...planilhaEditFieldSx,
  gridColumn: '1 / -1',
  '& .MuiOutlinedInput-root': {
    ...planilhaEditFieldSx['& .MuiOutlinedInput-root'],
    alignItems: 'flex-start',
    minHeight: 72,
  },
  '& .MuiInputBase-input': {
    fontSize: '0.84rem',
    lineHeight: 1.4,
    py: 1.05,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  },
} as const

/** Menu do Select acima do modal de edição (zIndex do Dialog = modal+20). */
export const planilhaEditSelectSlotProps = {
  select: {
    MenuProps: {
      sx: {
        zIndex: (theme: { zIndex: { modal: number } }) => theme.zIndex.modal + 50,
      },
    },
  },
} as const

/** Lista do Autocomplete acima do modal de edição (evita opções atrás/embaçadas). */
export const planilhaEditAutocompleteSlotProps = {
  popper: {
    sx: {
      zIndex: (theme: { zIndex: { modal: number } }) => theme.zIndex.modal + 50,
    },
  },
  paper: {
    sx: {
      boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
    },
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
        px: { xs: 1.25, sm: 1.5 },
        py: 1.25,
        display: 'grid',
        gap: 1,
      }}
    >
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '0.7rem',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: premiumTokens.primaryDark,
          lineHeight: 1.2,
          mb: 0.15,
        }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 1.35,
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
  /** Texto auxiliar ao lado do título (ex.: quantidade de lançamentos). */
  subtitle?: string
  badge?: string
  onClose: () => void
  onSave: () => void
  saveLabel?: string
  children: ReactNode
  /**
   * Id da linha (`data-planilha-linha-id`): o modal fica centralizado
   * e ancorado na base dessa linha.
   */
  anchorLinhaId?: string | null
  /** @deprecated Use anchorLinhaId — mantido por compatibilidade. */
  dockBelowRow?: boolean
  /** Altura máxima preferida do papel (px), quando há âncora/espaço. */
  preferredMaxHeightPx?: number
}

const ROW_GAP_PX = 10
const VIEWPORT_PAD_PX = 8
const MIN_PAPER_HEIGHT_PX = 200

/**
 * Modal compacto para editar lançamentos — sempre centralizado na
 * horizontal e ancorado na base da linha da planilha.
 */
export function PlanilhaLinhaEditDialog({
  open,
  title,
  subtitle,
  badge = 'Edição',
  onClose,
  onSave,
  saveLabel = 'Salvar lançamento',
  children,
  anchorLinhaId = null,
  dockBelowRow = false,
  preferredMaxHeightPx = 780,
}: PlanilhaLinhaEditDialogProps) {
  const [anchorTop, setAnchorTop] = useState<number | null>(null)
  const [maxPaperHeight, setMaxPaperHeight] = useState<number | null>(null)
  const anchored = Boolean(open && (anchorLinhaId || dockBelowRow))

  useLayoutEffect(() => {
    if (!open) {
      setAnchorTop(null)
      setMaxPaperHeight(null)
      return
    }

    const update = () => {
      const vh = window.innerHeight
      const preferredCap = Math.min(vh * 0.9, preferredMaxHeightPx)
      if (!anchorLinhaId) {
        setAnchorTop(null)
        setMaxPaperHeight(preferredCap)
        return
      }

      const row = document.querySelector(
        `[data-planilha-linha-id="${CSS.escape(anchorLinhaId)}"]`,
      ) as HTMLElement | null

      if (!row) {
        setAnchorTop(null)
        setMaxPaperHeight(preferredCap)
        return
      }

      const rect = row.getBoundingClientRect()
      // Sempre na base da linha (não reposiciona para o centro da tela).
      const top = Math.max(
        VIEWPORT_PAD_PX,
        Math.round(rect.bottom + ROW_GAP_PX),
      )
      const availableBelow = Math.max(MIN_PAPER_HEIGHT_PX, vh - top - VIEWPORT_PAD_PX)
      const maxH = Math.min(Math.min(vh * 0.88, preferredMaxHeightPx), availableBelow)
      setAnchorTop(top)
      setMaxPaperHeight(maxH)
    }

    update()
    // Aguarda a linha subir ao topo / layout estabilizar
    const t1 = window.setTimeout(update, 50)
    const t2 = window.setTimeout(update, 160)
    const t3 = window.setTimeout(update, 320)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, anchorLinhaId, preferredMaxHeightPx])

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
        '& .MuiDialog-container': {
          alignItems: 'flex-start',
          justifyContent: 'center',
          px: { xs: 1, sm: 2 },
          // Sem âncora: centraliza verticalmente via padding simétrico.
          pt: anchorTop != null ? 0 : 'min(12vh, 96px)',
          pb: VIEWPORT_PAD_PX,
        },
      }}
      slotProps={{
        backdrop: {
          sx: anchored
            ? {
                bgcolor: 'transparent',
                backdropFilter: 'none',
                backgroundImage: `linear-gradient(
                  to bottom,
                  transparent 0%,
                  transparent 28%,
                  ${alpha('#0f172a', 0.1)} 45%,
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
            borderRadius: 2,
            overflow: 'hidden',
            width: { xs: '96vw', md: 'min(1100px, 94vw)' },
            maxWidth: '1100px',
            maxHeight: maxPaperHeight != null ? `${maxPaperHeight}px` : 'min(90vh, 720px)',
            // Sempre centralizado na horizontal; topo = base da linha.
            m: 0,
            mx: 'auto',
            mt: anchorTop != null ? `${anchorTop}px` : 0,
            mb: 0,
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
          <Box sx={{ minWidth: 0 }}>
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
            {subtitle ? (
              <Typography
                sx={{
                  mt: 0.2,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: alpha('#0f172a', 0.62),
                  lineHeight: 1.25,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {subtitle}
              </Typography>
            ) : null}
          </Box>
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
          px: { xs: 1.5, sm: 2 },
          py: 1.35,
          overflowX: 'hidden',
          overflowY: 'auto',
          flex: '1 1 auto',
          minHeight: 0,
          bgcolor: alpha('#f8fafc', 0.55),
          display: 'grid',
          gap: 1.25,
          alignContent: 'start',
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
