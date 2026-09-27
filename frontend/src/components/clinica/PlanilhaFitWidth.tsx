import { Box } from '@mui/material'
import type { ReactNode } from 'react'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'

interface PlanilhaFitWidthProps {
  /** Quando true, a planilha ocupa 100% da largura disponível. */
  enabled: boolean
  children: ReactNode
  remountKey?: string | number
  /** Tamanho da fonte das células (ex.: 11px recolhida, 10px expandida). */
  cellFontSize?: string
  /** Peso da fonte das células. */
  cellFontWeight?: number
  /** Preenche a altura restante (modo expandido). */
  fillHeight?: boolean
}

/**
 * Container de largura total: encaixa a tabela no espaço disponível.
 * Todas as colunas ficam visíveis; sem rolagem horizontal.
 */
export function PlanilhaFitWidth({
  enabled,
  children,
  cellFontSize,
  cellFontWeight,
  fillHeight = false,
}: PlanilhaFitWidthProps) {
  if (!enabled) {
    return <>{children}</>
  }

  const fontSize = cellFontSize ?? EXCEL_SHEET.fontSize
  const fontWeight = cellFontWeight ?? EXCEL_SHEET.fontWeight

  return (
    <Box
      className="excel-sheet-fit-width"
      sx={{
        width: '100%',
        maxWidth: '100%',
        flex: fillHeight ? 1 : undefined,
        minHeight: 0,
        minWidth: 0,
        overflowX: 'hidden',
        overflowY: fillHeight ? 'auto' : 'visible',
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
          fontWeight: `${fontWeight} !important`,
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
