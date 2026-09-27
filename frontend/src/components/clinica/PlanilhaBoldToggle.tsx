import FormatBoldRoundedIcon from '@mui/icons-material/FormatBoldRounded'
import { IconButton } from '@mui/material'
import { useState } from 'react'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'

const BOLD_STORAGE_KEY = 'acompsol.planilhaExpandedBold'

function readStoredBold(defaultValue: boolean): boolean {
  try {
    const raw = localStorage.getItem(BOLD_STORAGE_KEY)
    if (raw === '0' || raw === 'false') return false
    if (raw === '1' || raw === 'true') return true
  } catch {
    /* storage indisponível */
  }
  return defaultValue
}

function writeStoredBold(value: boolean) {
  try {
    localStorage.setItem(BOLD_STORAGE_KEY, value ? '1' : '0')
  } catch {
    /* storage indisponível */
  }
}

/**
 * Preferência de negrito da planilha expandida — persiste entre aberturas
 * (localStorage) para IMH e Div. Material.
 */
export function usePlanilhaBoldPreference(defaultValue = true) {
  const [boldEnabled, setBoldEnabledState] = useState(() => readStoredBold(defaultValue))

  const setBoldEnabled = (next: boolean | ((prev: boolean) => boolean)) => {
    setBoldEnabledState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next
      writeStoredBold(value)
      return value
    })
  }

  const toggleBold = () => setBoldEnabled((prev) => !prev)

  return { boldEnabled, setBoldEnabled, toggleBold }
}

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
