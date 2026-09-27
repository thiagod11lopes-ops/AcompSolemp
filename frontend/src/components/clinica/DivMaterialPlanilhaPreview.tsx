import {
  DeleteOutlined as DeleteIcon,
  DeleteOutlined as TrashIcon,
  DescriptionOutlined as GerarDocIcon,
  EditOutlined as EditIcon,
} from '@mui/icons-material'
import {
  PlanilhaBoldToggle,
  usePlanilhaBoldPreference,
} from '@/components/clinica/PlanilhaBoldToggle'
import {
  Box,
  Button,
  Checkbox,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GerarDocumentoModal } from '@/components/clinica/GerarDocumentoModal'
import { PlanilhaDataFiltros } from '@/components/clinica/PlanilhaDataFiltros'
import {
  PlanilhaExpandButton,
  PlanilhaFullscreenDialog,
  usePlanilhaExpand,
} from '@/components/clinica/PlanilhaExpandControls'
import { PlanilhaFitWidth } from '@/components/clinica/PlanilhaFitWidth'
import {
  PlanilhaActionsButtons,
  PlanilhaExpandedCellContent,
  planilhaActionsCellSx,
  usePlanilhaColunaHover,
} from '@/components/clinica/planilhaColunaHover'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import {
  DIV_MATERIAL_COLUNAS,
  type DivMaterialLinha,
} from '@/utils/divMaterialForm'
import { downloadGerarDocumento } from '@/utils/gerarDocumentoTabela'
import {
  linhaPassaNoFiltroData,
  type PlanilhaDataFiltro,
} from '@/utils/planilhaDataFiltro'
import { wrapTextGramatical } from '@/utils/textWrapGramatical'
import '@/components/clinica/spreadsheet-excel.css'

/** Colunas que quebram linha após ~50 caracteres (limites de palavra). */
const DIV_MAT_WRAP_COL_KEYS = new Set(['descricaoMaterial', 'nomePaciente'])
const DIV_MAT_WRAP_MAX_CHARS = 50

function formatDivMatCellText(colKey: string, raw: string): string {
  const base = dash(raw)
  if (base === '—' || !DIV_MAT_WRAP_COL_KEYS.has(colKey)) return base
  return wrapTextGramatical(base, DIV_MAT_WRAP_MAX_CHARS)
}

interface DivMaterialPlanilhaPreviewProps {
  linhas: DivMaterialLinha[]
  editingLinhaId?: string | null
  selectedIds?: Set<string>
  onSelectedIdsChange?: (next: Set<string>) => void
  finalizedIds?: Set<string>
  /** Linhas devolvidas (checkbox laranja) liberadas para reenvio. */
  devolvidosIds?: Set<string>
  onEditLinha?: (linhaId: string) => void
  onDeleteLinha?: (linhaId: string) => void
  onRequestClear?: () => void
  dataFiltro: PlanilhaDataFiltro
  onDataFiltroChange: (next: PlanilhaDataFiltro) => void
  /** Notifica o pai quando a planilha entra/sai do modo expandido. */
  onExpandedChange?: (expanded: boolean) => void
}

function dash(value: string): string {
  const trimmed = value.trim()
  return trimmed || '—'
}

const cellSx = {
  border: EXCEL_SHEET.border,
  fontFamily: EXCEL_SHEET.fontFamily,
  fontSize: EXCEL_SHEET.fontSize,
  fontWeight: EXCEL_SHEET.fontWeight,
  py: 0.75,
  px: 1,
  color: EXCEL_SHEET.text,
  bgcolor: EXCEL_SHEET.cellBg,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
  whiteSpace: 'nowrap' as const,
} as const

/** Viewport: no máximo 12 linhas de dados + cabeçalho (rolagem vertical/horizontal na base). */
const DIV_MAT_VISIBLE_BODY_ROWS = 12
const DIV_MAT_HEADER_HEIGHT_PX = 44
const DIV_MAT_ROW_HEIGHT_PX = 40
const DIV_MAT_GRID_PAD_PX = 24
const DIV_MAT_VIEWPORT_MAX_HEIGHT_PX =
  DIV_MAT_HEADER_HEIGHT_PX +
  DIV_MAT_VISIBLE_BODY_ROWS * DIV_MAT_ROW_HEIGHT_PX +
  DIV_MAT_GRID_PAD_PX

const headerSx = {
  ...cellSx,
  bgcolor: EXCEL_SHEET.headerBg,
  fontWeight: EXCEL_SHEET.fontWeightBold,
  color: EXCEL_SHEET.mutedText,
  position: 'sticky' as const,
  top: 0,
  zIndex: 2,
} as const

const finalizedCheckboxSx = {
  color: EXCEL_SHEET.finalizedCheck,
  '&.Mui-checked': { color: EXCEL_SHEET.finalizedCheck },
  opacity: 0.55,
} as const

const devolvidoCheckboxSx = {
  color: EXCEL_SHEET.devolvidoCheck,
  '&.Mui-checked': { color: EXCEL_SHEET.devolvidoCheck },
} as const

const selectedCheckboxSx = {
  color: EXCEL_SHEET.selectedCheck,
  '&.Mui-checked': { color: EXCEL_SHEET.selectedCheck },
} as const

export function DivMaterialPlanilhaPreview({
  linhas,
  editingLinhaId = null,
  selectedIds,
  onSelectedIdsChange,
  finalizedIds,
  devolvidosIds,
  onEditLinha,
  onDeleteLinha,
  onRequestClear,
  dataFiltro,
  onDataFiltroChange,
  onExpandedChange,
}: DivMaterialPlanilhaPreviewProps) {
  const [gerarOpen, setGerarOpen] = useState(false)
  const { boldEnabled, toggleBold } = usePlanilhaBoldPreference()
  const { expanded, setExpanded } = usePlanilhaExpand()
  const tableRef = useRef<HTMLTableElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    onExpandedChange?.(expanded)
  }, [expanded, onExpandedChange])

  const datas = useMemo(() => linhas.map((l) => l.dataProcedimento), [linhas])
  const linhasFiltradas = useMemo(
    () => linhas.filter((linha) => linhaPassaNoFiltroData(linha.dataProcedimento, dataFiltro)),
    [linhas, dataFiltro],
  )
  /** Em edição: linha ativa sobe para o topo (ordem só visual). */
  const linhasExibidas = useMemo(() => {
    if (!editingLinhaId) return linhasFiltradas
    const ativa = linhasFiltradas.find((l) => l.id === editingLinhaId)
    if (!ativa) return linhasFiltradas
    return [ativa, ...linhasFiltradas.filter((l) => l.id !== editingLinhaId)]
  }, [linhasFiltradas, editingLinhaId])

  useEffect(() => {
    if (!expanded || !editingLinhaId) return
    const scrollRoot = scrollContainerRef.current
    if (!scrollRoot) return
    const run = () => {
      scrollRoot.scrollTo({ top: 0, behavior: 'smooth' })
      const row = scrollRoot.querySelector(
        `[data-planilha-linha-id="${editingLinhaId}"]`,
      ) as HTMLElement | null
      row?.scrollIntoView({ block: 'start', behavior: 'smooth', inline: 'nearest' })
    }
    // Aguarda reordenação + padding do modal dockado
    requestAnimationFrame(() => requestAnimationFrame(run))
    const t = window.setTimeout(run, 80)
    return () => window.clearTimeout(t)
  }, [expanded, editingLinhaId, linhasExibidas])

  const cellTextsByKey = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const col of DIV_MATERIAL_COLUNAS) {
      map[col.key] = linhasExibidas.map((linha) =>
        formatDivMatCellText(col.key, String(linha[col.key] ?? '')),
      )
    }
    return map
  }, [linhasExibidas])

  const selectionEnabled = Boolean(onSelectedIdsChange)
  /** Editar só na planilha expandida; excluir permanece nos dois modos. */
  const editEnabled = Boolean(expanded && onEditLinha)
  const deleteEnabled = Boolean(onDeleteLinha)
  const actionsEnabled = editEnabled || deleteEnabled
  const isEditingMode = Boolean(editingLinhaId)
  const cellFontSize = expanded ? '10px' : EXCEL_SHEET.fontSize
  const cellFontWeight =
    expanded && boldEnabled ? EXCEL_SHEET.fontWeightBold : EXCEL_SHEET.fontWeight
  const {
    resolveColWidth,
    isColHovered,
    colHoverHandlers,
    selectionWidth,
    actionsWidth,
  } = usePlanilhaColunaHover(DIV_MATERIAL_COLUNAS, {
    selectionEnabled,
    actionsEnabled,
    descricaoKey: 'descricaoMaterial',
    cellTextsByKey,
    tableRef,
    fontSizePx: expanded ? 10 : 11,
    fontWeight: cellFontWeight,
  })
  const selection = selectedIds ?? new Set<string>()
  const finalized = finalizedIds ?? new Set<string>()
  const devolvidos = devolvidosIds ?? new Set<string>()
  const selecionaveis = linhasFiltradas.filter((l) => !finalized.has(l.id))
  const allSelected =
    selecionaveis.length > 0 && selecionaveis.every((l) => selection.has(l.id))
  const someSelected = selecionaveis.some((l) => selection.has(l.id))
  const visible = linhas.length > 0
  const colCount =
    DIV_MATERIAL_COLUNAS.length + (selectionEnabled ? 1 : 0) + (actionsEnabled ? 1 : 0)
  const dimmedSx = {
    opacity: 0.28,
    transition: 'opacity 160ms ease',
    pointerEvents: 'none' as const,
  }

  const toggleAll = (checked: boolean) => {
    if (!onSelectedIdsChange) return
    const next = new Set(selection)
    for (const linha of selecionaveis) {
      if (checked) next.add(linha.id)
      else next.delete(linha.id)
    }
    onSelectedIdsChange(next)
  }

  const toggleOne = (linhaId: string, checked: boolean) => {
    if (!onSelectedIdsChange || finalized.has(linhaId)) return
    const next = new Set(selection)
    if (checked) next.add(linhaId)
    else next.delete(linhaId)
    onSelectedIdsChange(next)
  }

  const sheet = (
      <Paper
        elevation={0}
        className={expanded ? 'excel-sheet excel-sheet-expanded' : 'excel-sheet'}
        sx={{
          borderRadius: expanded ? 0 : 2,
          overflow: 'hidden',
          border: `1px solid ${EXCEL_SHEET.toolbarBorder}`,
          boxShadow:
            expanded || !visible
              ? 'none'
              : '0 12px 40px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)',
          bgcolor: EXCEL_SHEET.sheetBg,
          ...(expanded
            ? {
                flex: 1,
                height: '100%',
                width: '100%',
                maxWidth: '100%',
                minHeight: 0,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
              }
            : {}),
        }}
      >
        <Box
          className="excel-sheet-toolbar"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            px: 1.5,
            py: 1,
            flexShrink: 0,
            background: `linear-gradient(180deg, ${EXCEL_SHEET.toolbarBg} 0%, #ebebeb 100%)`,
            ...(isEditingMode ? dimmedSx : { transition: 'opacity 160ms ease' }),
          }}
        >
          <Typography
            sx={{
              fontFamily: EXCEL_SHEET.fontFamily,
              fontWeight: 800,
              fontSize: 13,
              color: EXCEL_SHEET.selectedCheck,
            }}
          >
            Div. Material
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={`${linhasFiltradas.length} de ${linhas.length} registro(s)`}
            sx={{ height: 22, fontWeight: 600 }}
          />
          {selectionEnabled && selection.size > 0 ? (
            <Chip
              size="small"
              variant="outlined"
              label={`${selection.size} marcado(s)`}
              sx={{ height: 22, fontWeight: 600, borderColor: EXCEL_SHEET.selectedCheck }}
            />
          ) : null}

          <PlanilhaDataFiltros
            idPrefix="div-mat-prev"
            value={dataFiltro}
            onChange={onDataFiltroChange}
            datas={datas}
          />

          {expanded ? (
            <PlanilhaBoldToggle enabled={boldEnabled} onToggle={toggleBold} />
          ) : null}

          <Button
            size="small"
            variant="outlined"
            startIcon={<GerarDocIcon sx={{ fontSize: 16 }} />}
            onClick={() => setGerarOpen(true)}
            disabled={linhasFiltradas.length === 0}
            sx={{
              ml: 0.5,
              height: 26,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            Gerar Documento
          </Button>

          <Box
            sx={{
              ml: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              flexShrink: 0,
            }}
          >
            <PlanilhaExpandButton
              expanded={expanded}
              onToggle={() => setExpanded((v) => !v)}
              labelExpand="Expandir planilha Div. Material"
              labelCollapse="Recolher planilha Div. Material"
            />
            {onRequestClear ? (
              <IconButton
                size="small"
                aria-label="Apagar lançamentos Div. Material"
                onClick={onRequestClear}
                disabled={linhas.length === 0}
                sx={{ color: 'error.main' }}
              >
                <TrashIcon fontSize="small" />
              </IconButton>
            ) : null}
          </Box>
        </Box>

        {!visible ? (
          <Box sx={{ px: 2.5, py: 4, textAlign: 'center', opacity: 0.55, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Importe o MODELO ou adicione lançamentos no formulário à esquerda para ver a planilha.
            </Typography>
          </Box>
        ) : (
          <Box
            ref={scrollContainerRef}
            className="excel-sheet-grid"
            sx={{
              p: expanded ? 0 : 1.5,
              borderTop: EXCEL_SHEET.border,
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              // Máx. 12 linhas visíveis; em tela cheia usa toda a página.
              // Com edição na expandida, reserva espaço inferior para o modal dockado.
              maxHeight: expanded ? 'none' : DIV_MAT_VIEWPORT_MAX_HEIGHT_PX,
              flex: expanded ? 1 : undefined,
              minHeight: 0,
              pb: expanded && editingLinhaId ? '54vh' : undefined,
              overflowX: 'hidden',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              WebkitOverflowScrolling: 'touch',
              boxSizing: 'border-box',
              '&::-webkit-scrollbar': {
                width: 10,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(15, 23, 42, 0.35)',
                borderRadius: 999,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(15, 23, 42, 0.08)',
              },
            }}
          >
            <PlanilhaFitWidth
              enabled
              fillHeight={expanded}
              cellFontSize={cellFontSize}
              cellFontWeight={cellFontWeight}
              nowrapBody
              remountKey={`${linhasFiltradas.length}-${selectionEnabled ? 1 : 0}-${actionsEnabled ? 1 : 0}`}
            >
            <Box
              sx={{
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                overflowX: 'hidden',
                border: EXCEL_SHEET.border,
                borderRadius: expanded ? 0 : 1,
                bgcolor: EXCEL_SHEET.sheetBg,
                boxSizing: 'border-box',
              }}
            >
              <Table
                ref={tableRef}
                size="small"
                stickyHeader={!expanded}
                sx={{
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                  tableLayout: 'fixed',
                  '& .MuiTableCell-root': {
                    boxSizing: 'border-box',
                    minWidth: '0 !important',
                    px: 0.5,
                    py: 0.5,
                    fontSize: cellFontSize,
                    fontWeight: cellFontWeight,
                  },
                  '& thead .MuiTableCell-root': {
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  },
                  '& tbody .MuiTableCell-root:not(.excel-planilha-actions-col):not(.excel-planilha-wrap-col)':
                    {
                      whiteSpace: 'nowrap',
                      wordBreak: 'normal',
                      overflowWrap: 'normal',
                      textOverflow: 'ellipsis',
                    },
                }}
              >
                <TableHead sx={isEditingMode ? dimmedSx : undefined}>
                  <TableRow>
                    {selectionEnabled ? (
                      <TableCell
                        sx={{
                          ...headerSx,
                          bgcolor: EXCEL_SHEET.selectHeaderBg,
                          width: selectionWidth,
                          minWidth: 0,
                          textAlign: 'center',
                          px: 0.5,
                          whiteSpace: 'normal',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 0.25,
                          }}
                        >
                          <Typography
                            component="span"
                            sx={{
                              fontWeight: 700,
                              lineHeight: 1,
                              fontSize: '10px',
                              color: EXCEL_SHEET.text,
                              letterSpacing: 0.4,
                            }}
                          >
                            DM
                          </Typography>
                          <Checkbox
                            size="small"
                            checked={allSelected}
                            indeterminate={someSelected && !allSelected}
                            disabled={selecionaveis.length === 0}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(_, checked) => toggleAll(checked)}
                            sx={{ p: 0, ...selectedCheckboxSx }}
                          />
                        </Box>
                      </TableCell>
                    ) : null}
                    {DIV_MATERIAL_COLUNAS.map((col) => {
                      const colWidth = resolveColWidth(col.key)
                      return (
                        <TableCell
                          key={col.key}
                          sx={{
                            ...headerSx,
                            width: colWidth,
                            minWidth: 0,
                            fontSize: cellFontSize,
                            whiteSpace: 'normal',
                            lineHeight: 1.2,
                            transition: 'width 160ms ease',
                          }}
                        >
                          {col.label}
                        </TableCell>
                      )
                    })}
                    {actionsEnabled ? (
                      <TableCell
                        className="excel-planilha-actions-col"
                        sx={{
                          ...headerSx,
                          ...planilhaActionsCellSx,
                          width: actionsWidth,
                          fontSize: cellFontSize,
                        }}
                      >
                        AÇÕES
                      </TableCell>
                    ) : null}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {linhasExibidas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={colCount} sx={{ ...cellSx, color: EXCEL_SHEET.mutedText }}>
                        Nenhum registro no período filtrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    linhasExibidas.map((linha, index) => {
                      const editing = editingLinhaId === linha.id
                      const finalizado = finalized.has(linha.id)
                      const devolvido = !finalizado && devolvidos.has(linha.id)
                      const checked = finalizado || selection.has(linha.id)
                      return (
                        <TableRow
                          key={linha.id}
                          data-planilha-linha-id={linha.id}
                          sx={{
                            bgcolor: editing
                              ? EXCEL_SHEET.editingBg
                              : selection.has(linha.id)
                                ? EXCEL_SHEET.selectedBg
                                : undefined,
                            position: editing ? 'relative' : undefined,
                            zIndex: editing ? 5 : undefined,
                            isolation: editing ? 'isolate' : undefined,
                            outline: editing ? `2px solid ${EXCEL_SHEET.selectedCheck}` : undefined,
                            outlineOffset: editing ? -2 : undefined,
                            boxShadow: editing
                              ? `0 0 0 1px ${EXCEL_SHEET.selectedCheck}, 0 4px 16px rgba(15,23,42,0.18)`
                              : undefined,
                            opacity: editing ? 1 : isEditingMode ? 0.22 : 1,
                            filter: editing ? 'none' : isEditingMode ? 'saturate(0.35)' : undefined,
                            transition: 'opacity 160ms ease, filter 160ms ease',
                            pointerEvents: isEditingMode && !editing ? 'none' : undefined,
                            '& > .MuiTableCell-root': editing
                              ? {
                                  bgcolor: `${EXCEL_SHEET.editingBg} !important`,
                                  opacity: '1 !important',
                                }
                              : undefined,
                            '&:hover > .MuiTableCell-root': {
                              bgcolor: editing ? EXCEL_SHEET.editingBg : EXCEL_SHEET.hoverBg,
                            },
                          }}
                        >
                          {selectionEnabled ? (
                            <TableCell
                              sx={{
                                ...cellSx,
                                bgcolor: editing
                                  ? EXCEL_SHEET.editingBg
                                  : EXCEL_SHEET.selectHeaderBg,
                                textAlign: 'center',
                                px: 0.5,
                                width: selectionWidth,
                                minWidth: 0,
                              }}
                            >
                              <Checkbox
                                size="small"
                                className={
                                  finalizado
                                    ? 'excel-checkbox-finalizado'
                                    : devolvido
                                      ? 'excel-checkbox-devolvido'
                                      : undefined
                                }
                                checked={checked}
                                disabled={finalizado}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(_, nextChecked) => toggleOne(linha.id, nextChecked)}
                                sx={{
                                  p: 0,
                                  ...(finalizado
                                    ? finalizedCheckboxSx
                                    : devolvido
                                      ? devolvidoCheckboxSx
                                      : selectedCheckboxSx),
                                }}
                              />
                            </TableCell>
                          ) : null}
                          {DIV_MATERIAL_COLUNAS.map((col) => {
                            const isDescricao = col.key === 'descricaoMaterial'
                            const allowWrap = DIV_MAT_WRAP_COL_KEYS.has(col.key)
                            const colWidth = resolveColWidth(col.key)
                            const text = formatDivMatCellText(
                              col.key,
                              String(linha[col.key] ?? ''),
                            )
                            const hovered = isColHovered(col.key)
                            return (
                              <TableCell
                                key={col.key}
                                className={allowWrap ? 'excel-planilha-wrap-col' : undefined}
                                {...colHoverHandlers(col.key)}
                                sx={{
                                  ...cellSx,
                                  width: colWidth,
                                  minWidth: hovered ? colWidth : 0,
                                  fontSize: cellFontSize,
                                  fontWeight: cellFontWeight,
                                  verticalAlign: 'middle',
                                  textAlign: isDescricao || allowWrap ? 'left' : 'center',
                                  transition: 'width 160ms ease',
                                  cursor: 'default',
                                  overflow: 'hidden',
                                  ...(allowWrap
                                    ? {
                                        whiteSpace: 'pre-line',
                                        wordBreak: 'normal',
                                        overflowWrap: 'normal',
                                        textOverflow: 'clip',
                                      }
                                    : {
                                        whiteSpace: 'nowrap',
                                        wordBreak: 'normal',
                                        overflowWrap: 'normal',
                                        textOverflow: hovered ? 'clip' : 'ellipsis',
                                      }),
                                }}
                              >
                                <PlanilhaExpandedCellContent
                                  showFull={hovered}
                                  allowWrap={allowWrap}
                                >
                                  {text}
                                </PlanilhaExpandedCellContent>
                              </TableCell>
                            )
                          })}
                          {actionsEnabled ? (
                            <TableCell
                              className="excel-planilha-actions-col"
                              sx={{
                                ...cellSx,
                                ...planilhaActionsCellSx,
                                width: actionsWidth,
                                fontSize: cellFontSize,
                                fontWeight: cellFontWeight,
                              }}
                            >
                              <PlanilhaActionsButtons>
                                {editEnabled ? (
                                  <IconButton
                                    size="small"
                                    aria-label={`Editar linha Div. Material ${index + 1}`}
                                    onClick={() => onEditLinha?.(linha.id)}
                                    sx={{ p: 0.25 }}
                                  >
                                    <EditIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                ) : null}
                                {deleteEnabled ? (
                                  <IconButton
                                    size="small"
                                    color="error"
                                    aria-label={`Excluir linha Div. Material ${index + 1}`}
                                    onClick={() => onDeleteLinha?.(linha.id)}
                                    sx={{ p: 0.25 }}
                                  >
                                    <DeleteIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                ) : null}
                              </PlanilhaActionsButtons>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </Box>
            </PlanilhaFitWidth>
          </Box>
        )}
      </Paper>
  )

  return (
    <Box
      sx={{
        opacity: visible ? 1 : 0.92,
        transform: expanded ? 'none' : visible ? 'translateY(0)' : 'translateY(4px)',
        transition: expanded ? undefined : 'opacity 280ms ease, transform 280ms ease',
      }}
    >
      {expanded ? (
        <PlanilhaFullscreenDialog open onClose={() => setExpanded(false)}>
          {sheet}
        </PlanilhaFullscreenDialog>
      ) : (
        sheet
      )}

      <GerarDocumentoModal
        open={gerarOpen}
        disabled={linhasFiltradas.length === 0}
        onClose={() => setGerarOpen(false)}
        onConfirm={async (formato) => {
          await downloadGerarDocumento(
            {
              titulo: 'Divisão de Material',
              fileBaseName: 'Div-Material',
              headers: DIV_MATERIAL_COLUNAS.map((c) => c.label),
              columnWidths: DIV_MATERIAL_COLUNAS.map((c) => c.width),
              rows: linhasFiltradas.map((linha) =>
                DIV_MATERIAL_COLUNAS.map((c) => String(linha[c.key] ?? '').trim()),
              ),
            },
            formato,
          )
        }}
      />
    </Box>
  )
}
