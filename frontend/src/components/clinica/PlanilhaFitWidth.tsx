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
 * Container de largura total: encaixa a tabela exatamente na largura da página.
 * Todas as colunas ficam visíveis; sem rolagem horizontal.
 */
export function PlanilhaFitWidth({ enabled, children, cellFontSize }: PlanilhaFitWidthProps) {
  if (!enabled) {
    return <>{children}</>
  }

  const fontSize = cellFontSize ?? EXCEL_SHEET.fontSizeExpanded

  return (
    <Box
      className="excel-sheet-fit-width"
      sx={{
        width: '100%',
        maxWidth: '100%',
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflowX: 'hidden',
        overflowY: 'auto',
        boxSizing: 'border-box',
        WebkitOverflowScrolling: 'touch',
        '& .excel-sheet-grid, & > *': {
          width: '100% !important',
          maxWidth: '100% !important',
          minWidth: '0 !important',
          boxSizing: 'border-box',
        },
        '& table, & .MuiTable-root': {
          width: '100% !important',
          maxWidth: '100% !important',
          minWidth: '0 !important',
          tableLayout: 'fixed !important',
        },
        '& th, & td, & .MuiTableCell-root': {
          minWidth: '0 !important',
          maxWidth: 'none !important',
          whiteSpace: 'normal !important',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          overflow: 'hidden',
          fontSize: `${fontSize} !important`,
          fontWeight: `${EXCEL_SHEET.fontWeightBold} !important`,
          lineHeight: 1.25,
          px: '4px !important',
          boxSizing: 'border-box',
        },
        '& thead .MuiTableCell-root, & th': {
          whiteSpace: 'normal !important',
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
