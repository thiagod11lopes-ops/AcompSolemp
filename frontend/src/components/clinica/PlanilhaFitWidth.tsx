import { Box } from '@mui/material'
import type { ReactNode, Ref } from 'react'
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
  /**
   * Corpo sem quebra de linha (padrão true).
   * Cabeçalhos continuam podendo quebrar para caber nas colunas.
   */
  nowrapBody?: boolean
  /** Ref do container com overflow (para rolar até a linha em edição). */
  scrollRef?: Ref<HTMLDivElement | null>
  /** Padding inferior extra (ex.: espaço para o modal dockado). */
  bottomPad?: string | number
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
  nowrapBody = true,
  scrollRef,
  bottomPad,
}: PlanilhaFitWidthProps) {
  if (!enabled) {
    return <>{children}</>
  }

  const fontSize = cellFontSize ?? EXCEL_SHEET.fontSize
  const fontWeight = cellFontWeight ?? EXCEL_SHEET.fontWeight

  return (
    <Box
      ref={scrollRef}
      className="excel-sheet-fit-width"
      sx={{
        width: '100%',
        maxWidth: '100%',
        flex: fillHeight ? 1 : undefined,
        minHeight: 0,
        minWidth: 0,
        overflowX: 'hidden',
        overflowY: fillHeight ? 'auto' : 'visible',
        pb: bottomPad,
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
          overflow: 'hidden',
          fontSize: `${fontSize} !important`,
          fontWeight: `${fontWeight} !important`,
          lineHeight: 1.25,
          px: '4px !important',
          boxSizing: 'border-box',
        },
        '& thead .MuiTableCell-root, & th': {
          whiteSpace: 'normal !important',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          hyphens: 'auto',
          lineHeight: 1.2,
          verticalAlign: 'middle',
          fontWeight: `${fontWeight} !important`,
        },
        '& tbody .MuiTableCell-root, & td': nowrapBody
          ? {
              whiteSpace: 'nowrap !important',
              wordBreak: 'normal',
              overflowWrap: 'normal',
              textOverflow: 'ellipsis',
              verticalAlign: 'middle',
            }
          : {
              whiteSpace: 'normal !important',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            },
        // Coluna Ações: largura fixa e ícones sempre lado a lado
        '& th.excel-planilha-actions-col, & td.excel-planilha-actions-col': {
          width: '76px !important',
          minWidth: '76px !important',
          maxWidth: '76px !important',
          whiteSpace: 'nowrap !important',
          overflow: 'visible !important',
          textOverflow: 'clip !important',
          wordBreak: 'normal !important',
          overflowWrap: 'normal !important',
          px: '2px !important',
        },
      }}
    >
      {children}
    </Box>
  )
}
