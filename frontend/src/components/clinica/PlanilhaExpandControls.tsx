import CloseFullscreenRoundedIcon from '@mui/icons-material/CloseFullscreenRounded'
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded'
import { Dialog, IconButton } from '@mui/material'
import { useState, type ReactNode } from 'react'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'

/** Estado de expansão da planilha. */
export function usePlanilhaExpand() {
  const [expanded, setExpanded] = useState(false)
  return { expanded, setExpanded }
}

interface PlanilhaExpandButtonProps {
  expanded: boolean
  onToggle: () => void
  labelExpand?: string
  labelCollapse?: string
}

/** Ícone à esquerda da lixeira: expandir / recolher planilha. */
export function PlanilhaExpandButton({
  expanded,
  onToggle,
  labelExpand = 'Expandir planilha',
  labelCollapse = 'Recolher planilha',
}: PlanilhaExpandButtonProps) {
  return (
    <IconButton
      size="small"
      aria-label={expanded ? labelCollapse : labelExpand}
      title={expanded ? labelCollapse : labelExpand}
      onClick={onToggle}
      sx={{ color: 'text.secondary' }}
    >
      {expanded ? (
        <CloseFullscreenRoundedIcon fontSize="small" />
      ) : (
        <OpenInFullRoundedIcon fontSize="small" />
      )}
    </IconButton>
  )
}

interface PlanilhaFullscreenDialogProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

/**
 * Overlay em tela cheia no body (acima de abas, títulos e sidebars).
 * Usar Dialog evita que transform/overflow dos pais limitem o fixed.
 */
export function PlanilhaFullscreenDialog({
  open,
  onClose,
  children,
}: PlanilhaFullscreenDialogProps) {
  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      // Acima de drawers (1200) e app bars; cobre todo o portal.
      sx={{ zIndex: (t) => t.zIndex.modal + 10 }}
      slotProps={{
        paper: {
          sx: {
            m: 0,
            // 100% evita overflow horizontal que 100vw causa com a barra de rolagem
            maxWidth: '100%',
            width: '100%',
            height: '100%',
            maxHeight: '100%',
            borderRadius: 0,
            bgcolor: EXCEL_SHEET.sheetBg,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxSizing: 'border-box',
          },
        },
      }}
    >
      {children}
    </Dialog>
  )
}
