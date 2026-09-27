import { Box } from '@mui/material'
import type { ReactNode } from 'react'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'

interface PlanilhaFitWidthProps {
  /** Quando true, a planilha ocupa 100% da largura (sem scale — fonte permanece legível). */
  enabled: boolean
  children: ReactNode
  remountKey?: string | number
  /** Sobrescreve o tamanho da fonte das células no modo expandido. */
  cellFontSize?: string
}

/**
 * Container de largura total: todas as colunas cabem na tela.
 * Títulos e células quebram linha; sem transform/scale.
 * Só afeta o modo expandido (enabled=true).
 */
export function PlanilhaFitWidth({ enabled, children, cellFontSize }: PlanilhaFitWidthProps) {
  if (!enabled) {
    return <>{children}</>
  }

  const fontSize = cellFontSize ?? EXCEL_SHEET.fontSizeExpanded

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflowX: 'hidden',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        '& .excel-sheet-grid': {
          width: '100% !important',
          maxWidth: '100% !important',
          minWidth: '0 !important',
          overflowX: 'hidden !important',
        },
        '& table': {
          width: '100% !important',
          maxWidth: '100% !important',
          minWidth: '0 !important',
          tableLayout: 'fixed',
        },
        '& th, & td, & .MuiTableCell-root': {
          minWidth: '0 !important',
          maxWidth: 'none',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          fontSize: `${fontSize} !important`,
          fontWeight: `${EXCEL_SHEET.fontWeightBold} !important`,
          lineHeight: 1.25,
          px: '4px !important',
        },
        '& thead .MuiTableCell-root, & th': {
          whiteSpace: 'normal',
          hyphens: 'auto',
          lineHeight: 1.2,
          verticalAlign: 'middle',
          fontWeight: `${EXCEL_SHEET.fontWeightBold} !important`,
        },
      }}
    >
      {children}
    </Box>
  )
}
