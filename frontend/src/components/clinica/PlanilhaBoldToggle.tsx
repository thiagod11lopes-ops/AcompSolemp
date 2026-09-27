import FormatBoldRoundedIcon from '@mui/icons-material/FormatBoldRounded'
import { IconButton } from '@mui/material'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'

interface PlanilhaBoldToggleProps {
  enabled: boolean
  onToggle: () => void
}

/** Alterna negrito na planilha expandida. */
export function PlanilhaBoldToggle({ enabled, onToggle }: PlanilhaBoldToggleProps) {
  return (
    <IconButton
      size="small"
      aria-label={enabled ? 'Remover negrito da planilha' : 'Aplicar negrito na planilha'}
      title={enabled ? 'Remover negrito' : 'Negrito'}
      aria-pressed={enabled}
      onClick={onToggle}
      sx={{
        ml: 0.25,
        width: 30,
        height: 30,
        borderRadius: 1,
        border: `1px solid ${enabled ? EXCEL_SHEET.selectedCheck : EXCEL_SHEET.toolbarBorder}`,
        bgcolor: enabled ? '#e8f5e9' : '#fff',
        color: enabled ? EXCEL_SHEET.selectedCheck : 'text.secondary',
        '&:hover': {
          bgcolor: enabled ? '#dcedc8' : EXCEL_SHEET.hoverBg,
          borderColor: EXCEL_SHEET.selectedCheck,
          color: EXCEL_SHEET.selectedCheck,
        },
      }}
    >
      <FormatBoldRoundedIcon sx={{ fontSize: 18 }} />
    </IconButton>
  )
}
