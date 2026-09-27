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
 * Container de largura total para a planilha expandida.
 * Não usa transform/scale para não reduzir a fonte das células.
 */
export function PlanilhaFitWidth({ enabled, children, cellFontSize }: PlanilhaFitWidthProps) {
  if (!enabled) {
    return <>{children}</>
  }

  const fontSize = cellFontSize ?? EXCEL_SHEET.fontSize

  return (
    <Box
      sx={{
        width: '100%',
        flex: 1,
        minHeight: 0,
        overflowX: 'hidden',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        '& .excel-sheet-grid': {
          width: '100% !important',
          maxWidth: '100% !important',
        },
        '& table': {
          width: '100% !important',
          minWidth: '0 !important',
          tableLayout: 'fixed',
        },
        '& th, & td, & .MuiTableCell-root, & .MuiTypography-root': {
          minWidth: '0 !important',
          maxWidth: 'none',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          fontSize: `${fontSize} !important`,
          lineHeight: 1.25,
        },
      }}
    >
      {children}
    </Box>
  )
}
