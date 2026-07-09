import {
  Box,
  Button,
  Checkbox,
  Chip,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
  alpha,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import PostAddIcon from '@mui/icons-material/PostAdd'
import RefreshIcon from '@mui/icons-material/Refresh'
import SendIcon from '@mui/icons-material/Send'
import InventoryIcon from '@mui/icons-material/Inventory'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table'
import { memo, useEffect, useMemo, useState, useCallback, type MouseEvent, type ReactNode } from 'react'
import {
  CONSUMO_MATERIAL_HEADERS,
  formatValorBrasileiro,
  type ConsumoMaterialRow,
} from '@/utils/consumoMaterialOds'
import { isLinhaPreenchida, rowPodeSerSelecionada, rowPodeSerEnviadaAuditoria, rowPodeSerEnviadaMaterial } from '@/utils/consumoMaterialTemplate'
import type {
  ConsumoMaterialColunaKey,
  InserirLinhaConsumoPosicao,
} from '@/utils/consumoMaterialTemplate'
import { ExcluirPlanilhaDialog } from '@/components/clinica/ExcluirPlanilhaDialog'
import { AdicionarPlanilhaModal } from '@/components/clinica/AdicionarPlanilhaModal'
import { FinalizadoLinhaModal } from '@/components/clinica/FinalizadoLinhaModal'
import {
  ColumnResizeHandle,
  RowResizeHandle,
  getColumnCellSx,
} from '@/components/clinica/SpreadsheetResizeHandle'
import {
  useSpreadsheetResize,
} from '@/hooks/useSpreadsheetResize'
import { SpreadsheetEditableCell } from '@/components/clinica/SpreadsheetEditableCell'
import {
  applyEditingDrafts,
  measureColumnWidths,
  mergeRowsForColumnMeasure,
  resolveColumnWidths,
} from '@/utils/spreadsheetColumnWidth'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import './spreadsheet-excel.css'

const DEFAULT_ROW_MIN_HEIGHT = 21

const GROUP_LABELS: Record<string, string> = {
  paciente: 'Dados do paciente',
  clinico: 'Dados clínicos',
  financeiro: 'Financeiro',
}

const FINALIZED_CHECKBOX_OPACITY = 0.55

const finalizedCheckboxSx = {
  color: alpha(EXCEL_SHEET.finalizedCheck, FINALIZED_CHECKBOX_OPACITY),
  '&.Mui-checked': {
    color: alpha(EXCEL_SHEET.finalizedCheck, FINALIZED_CHECKBOX_OPACITY),
  },
  '&.Mui-disabled': {
    color: alpha(EXCEL_SHEET.finalizedCheck, FINALIZED_CHECKBOX_OPACITY),
  },
  '&.Mui-disabled.Mui-checked': {
    color: alpha(EXCEL_SHEET.finalizedCheck, FINALIZED_CHECKBOX_OPACITY),
  },
} as const

const cellContentSx = {
  display: 'block',
  whiteSpace: 'nowrap' as const,
}

function toSingleLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

interface ContextMenuState {
  mouseX: number
  mouseY: number
  rowId: string
}

export type ConsumoEnvioCanal = 'auditoria' | 'material'

const SELECT_COLUMN_IDS = ['select-a', 'select-s'] as const

interface ConsumoMaterialSpreadsheetProps {
  measureRows?: ConsumoMaterialRow[]
  rows: ConsumoMaterialRow[]
  fileName: string
  rowSelectionAuditoria: RowSelectionState
  onRowSelectionAuditoriaChange: (selection: RowSelectionState) => void
  rowSelectionMaterial: RowSelectionState
  onRowSelectionMaterialChange: (selection: RowSelectionState) => void
  mesReferencia?: string
  lancamentosPreenchidos?: number
  rowIdsComPedido?: Set<string>
  finalizedAuditoriaRowIds?: Set<string>
  finalizedMaterialRowIds?: Set<string>
  totalLancamentos?: number
  onExcluirTudo?: () => Promise<void>
  onAdicionarPlanilha?: (mes: number, ano: number, file: File) => Promise<void>
  isExcluindo?: boolean
  isAdicionando?: boolean
  addPlanilhaError?: string | null
  onAddPlanilhaErrorClear?: () => void
  onLimparRascunho?: () => void
  onEnviarImh?: () => void
  onEnviarMaterial?: () => void
  modoMedicamento?: boolean
  isEnviando?: boolean
  editable?: boolean
  onCellChange?: (rowId: string, field: ConsumoMaterialColunaKey, value: string) => void
  onInserirLinha?: (rowId: string, position: InserirLinhaConsumoPosicao) => void
  onExcluirLinha?: (rowId: string) => void
  onDesfinalizarLinha?: (rowId: string, canal: ConsumoEnvioCanal) => void
  headerExtra?: ReactNode
}

function ConsumoMaterialSpreadsheetInner({
  measureRows,
  rows,
  fileName,
  rowSelectionAuditoria,
  onRowSelectionAuditoriaChange,
  rowSelectionMaterial,
  onRowSelectionMaterialChange,
  mesReferencia,
  lancamentosPreenchidos,
  rowIdsComPedido,
  finalizedAuditoriaRowIds,
  finalizedMaterialRowIds,
  totalLancamentos = 0,
  onExcluirTudo,
  onAdicionarPlanilha,
  isExcluindo = false,
  isAdicionando = false,
  addPlanilhaError = null,
  onAddPlanilhaErrorClear,
  onLimparRascunho,
  onEnviarImh,
  onEnviarMaterial,
  modoMedicamento = false,
  isEnviando = false,
  editable = false,
  onCellChange,
  onInserirLinha,
  onExcluirLinha,
  onDesfinalizarLinha,
  headerExtra,
}: ConsumoMaterialSpreadsheetProps) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 })
  const [excluirOpen, setExcluirOpen] = useState(false)
  const [adicionarOpen, setAdicionarOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [editingDrafts, setEditingDrafts] = useState<Record<string, string>>({})
  const [finalizadoModalRow, setFinalizadoModalRow] = useState<ConsumoMaterialRow | null>(null)
  const [finalizadoModalCanal, setFinalizadoModalCanal] = useState<ConsumoEnvioCanal | null>(null)

  const { columnWidths, getRowHeight, startColumnResize, startRowResize } =
    useSpreadsheetResize()

  const handleDraftChange = useCallback(
    (rowId: string, field: ConsumoMaterialColunaKey, draft: string | null) => {
      const key = `${rowId}:${field}`
      setEditingDrafts((prev) => {
        if (draft === null) {
          if (!(key in prev)) return prev
          const { [key]: _, ...rest } = prev
          return rest
        }
        if (prev[key] === draft) return prev
        return { ...prev, [key]: draft }
      })
    },
    [],
  )

  const rowsForMeasurement = useMemo(() => {
    const merged = measureRows
      ? mergeRowsForColumnMeasure(measureRows, rows)
      : rows
    return applyEditingDrafts(merged, editingDrafts)
  }, [measureRows, rows, editingDrafts])

  const rowMatchesFilter = useCallback((row: ConsumoMaterialRow, filterValue: string) => {
    const q = filterValue.toLowerCase()
    if (!q) return true
    return [
      row.nip,
      row.nome,
      row.procedimento,
      row.fornecedor,
      row.cirurgiao,
      row.materiais,
      row.empenho,
      row.valor,
    ].some((v) => v.toLowerCase().includes(q))
  }, [])

  const filteredRowCount = useMemo(() => {
    if (!globalFilter.trim()) return rows.length
    return rows.filter((row) => rowMatchesFilter(row, globalFilter)).length
  }, [rows, globalFilter, rowMatchesFilter])

  const lastPageIndex = useMemo(
    () => Math.max(0, Math.ceil(filteredRowCount / pagination.pageSize) - 1),
    [filteredRowCount, pagination.pageSize],
  )

  const contentColumnWidths = useMemo(
    () => measureColumnWidths(rowsForMeasurement, CONSUMO_MATERIAL_HEADERS, editable),
    [rowsForMeasurement, editable],
  )

  const resolvedColumnWidths = useMemo(
    () => resolveColumnWidths(contentColumnWidths, columnWidths),
    [contentColumnWidths, columnWidths],
  )

  const tableMinWidth = useMemo(
    () => Object.values(resolvedColumnWidths).reduce((sum, width) => sum + width, 0),
    [resolvedColumnWidths],
  )

  const showPlanilhaActions = lancamentosPreenchidos !== undefined && onExcluirTudo && onAdicionarPlanilha

  const handleExcluirConfirm = async () => {
    if (!onExcluirTudo) return
    await onExcluirTudo()
    setExcluirOpen(false)
  }

  const handleAdicionarFile = async (mes: number, ano: number, file: File) => {
    if (!onAdicionarPlanilha) return
    await onAdicionarPlanilha(mes, ano, file)
    setAdicionarOpen(false)
  }

  const openAdicionarModal = () => {
    onAddPlanilhaErrorClear?.()
    setAdicionarOpen(true)
  }

  const handleContextMenu = useCallback((event: MouseEvent, rowId: string) => {
    if (!editable || !onInserirLinha || !onExcluirLinha) return
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      rowId,
    })
  }, [editable, onInserirLinha, onExcluirLinha])

  const closeContextMenu = () => setContextMenu(null)

  const handleInserirFromMenu = (position: InserirLinhaConsumoPosicao) => {
    if (!contextMenu || !onInserirLinha) return
    onInserirLinha(contextMenu.rowId, position)
    closeContextMenu()
  }

  const handleExcluirFromMenu = () => {
    if (!contextMenu || !onExcluirLinha) return
    onExcluirLinha(contextMenu.rowId)
    closeContextMenu()
  }

  const handleFinalizadoCheckboxClick = useCallback(
    (event: MouseEvent, row: ConsumoMaterialRow, canal: ConsumoEnvioCanal) => {
      event.stopPropagation()
      event.preventDefault()
      setFinalizadoModalRow(row)
      setFinalizadoModalCanal(canal)
    },
    [],
  )

  const closeFinalizadoModal = useCallback(() => {
    setFinalizadoModalRow(null)
    setFinalizadoModalCanal(null)
  }, [])

  const handleDesmarcarFinalizado = useCallback(() => {
    if (!finalizadoModalRow || !finalizadoModalCanal || !onDesfinalizarLinha) return
    onDesfinalizarLinha(finalizadoModalRow.id, finalizadoModalCanal)
    closeFinalizadoModal()
  }, [finalizadoModalRow, finalizadoModalCanal, onDesfinalizarLinha, closeFinalizadoModal])

  const isFinalizadoAuditoria = useCallback(
    (row: ConsumoMaterialRow) => Boolean(finalizedAuditoriaRowIds?.has(row.id)),
    [finalizedAuditoriaRowIds],
  )

  const isFinalizadoMaterial = useCallback(
    (row: ConsumoMaterialRow) => Boolean(finalizedMaterialRowIds?.has(row.id)),
    [finalizedMaterialRowIds],
  )

  const podeSelecionarAuditoria = useCallback(
    (row: ConsumoMaterialRow) => rowPodeSerSelecionada(row) && !isFinalizadoAuditoria(row),
    [isFinalizadoAuditoria],
  )

  const podeSelecionarMaterial = useCallback(
    (row: ConsumoMaterialRow) => rowPodeSerSelecionada(row) && !isFinalizadoMaterial(row),
    [isFinalizadoMaterial],
  )

  const toggleRowSelection = useCallback(
  (
    rowId: string,
    checked: boolean,
    selection: RowSelectionState,
    onChange: (next: RowSelectionState) => void,
    finalizedIds?: Set<string>,
  ) => {
    const next = { ...selection }
    if (checked) next[rowId] = true
    else delete next[rowId]
    if (finalizedIds?.size) {
      for (const id of finalizedIds) next[id] = true
    }
    onChange(next)
  },
  [],
)

  const createEnvioSelectColumn = useCallback(
    (
      columnId: 'select-a' | 'select-s',
      headerLabel: 'A' | 'S' | 'IMH',
      canal: ConsumoEnvioCanal,
      selection: RowSelectionState,
      onSelectionChange: (next: RowSelectionState) => void,
      finalizedIds: Set<string> | undefined,
      podeSelecionar: (row: ConsumoMaterialRow) => boolean,
      isFinalizado: (row: ConsumoMaterialRow) => boolean,
    ): ColumnDef<ConsumoMaterialRow> => ({
      id: columnId,
      size: 40,
      enableSorting: false,
      header: () => {
        const pageRows = rows.filter((row) => podeSelecionar(row))
        const allSelected =
          pageRows.length > 0 && pageRows.every((row) => Boolean(selection[row.id]))
        const someSelected = pageRows.some((row) => Boolean(selection[row.id]))
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
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
              {headerLabel}
            </Typography>
            <Checkbox
              size="small"
              checked={allSelected}
              indeterminate={someSelected && !allSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={(_, checked) => {
                const next = { ...selection }
                for (const row of pageRows) {
                  if (checked) next[row.id] = true
                  else delete next[row.id]
                }
                if (finalizedIds?.size) {
                  for (const rowId of finalizedIds) next[rowId] = true
                }
                onSelectionChange(next)
              }}
              sx={{ p: 0 }}
            />
          </Box>
        )
      },
      cell: ({ row }) => {
        const finalizado = isFinalizado(row.original)
        const selecionavel = podeSelecionar(row.original)
        const checked = finalizado || Boolean(selection[row.original.id])
        return (
          <Checkbox
            size="small"
            checked={checked}
            disabled={!selecionavel && !finalizado}
            onClick={(e) => {
              if (finalizado) handleFinalizadoCheckboxClick(e, row.original, canal)
            }}
            onChange={(_, nextChecked) => {
              if (finalizado) return
              toggleRowSelection(
                row.original.id,
                nextChecked,
                selection,
                onSelectionChange,
                finalizedIds,
              )
            }}
            sx={{
              ...(finalizado ? finalizedCheckboxSx : undefined),
              ...(finalizado ? { cursor: 'pointer' } : undefined),
            }}
          />
        )
      },
    }),
    [rows, handleFinalizadoCheckboxClick, toggleRowSelection],
  )

  const columns = useMemo<ColumnDef<ConsumoMaterialRow>[]>(() => {
    const dataColumns: ColumnDef<ConsumoMaterialRow>[] = CONSUMO_MATERIAL_HEADERS.map(
      (col) => ({
        id: col.key,
        accessorKey: col.key,
        header: col.label,
        cell: ({ getValue, row }) => {
          const field = col.key as ConsumoMaterialColunaKey
          const value = String(getValue() ?? '')
          const rowId = row.original.id

          if (editable && onCellChange) {
            return (
              <SpreadsheetEditableCell
                rowId={rowId}
                field={field}
                value={value}
                onCellChange={onCellChange}
                onDraftChange={handleDraftChange}
                onContextMenu={handleContextMenu}
              />
            )
          }

          if (col.key === 'valor') {
            const num = row.original.valorNumerico
            if (!isLinhaPreenchida(row.original) && !num) {
              return <span>&nbsp;</span>
            }
            return (
              <Typography
                component="span"
                className="excel-cell-number"
                sx={{
                  fontFamily: EXCEL_SHEET.fontFamily,
                  fontSize: EXCEL_SHEET.fontSize,
                  fontWeight: 400,
                  color: EXCEL_SHEET.text,
                  ...cellContentSx,
                }}
              >
                {num > 0 ? formatValorBrasileiro(num) : toSingleLine(value) || ''}
              </Typography>
            )
          }
          if (!isLinhaPreenchida(row.original) && !value) {
            return <span>&nbsp;</span>
          }
          return (
            <Typography
              component="span"
              sx={{
                fontFamily: EXCEL_SHEET.fontFamily,
                fontSize: EXCEL_SHEET.fontSize,
                fontWeight: 400,
                color: EXCEL_SHEET.text,
                ...cellContentSx,
              }}
            >
              {toSingleLine(value) || ''}
            </Typography>
          )
        },
      }),
    )

    return [
      createEnvioSelectColumn(
        'select-a',
        modoMedicamento ? 'IMH' : 'A',
        'auditoria',
        rowSelectionAuditoria,
        onRowSelectionAuditoriaChange,
        finalizedAuditoriaRowIds,
        podeSelecionarAuditoria,
        isFinalizadoAuditoria,
      ),
      ...(modoMedicamento
        ? []
        : [
            createEnvioSelectColumn(
              'select-s',
              'S',
              'material',
              rowSelectionMaterial,
              onRowSelectionMaterialChange,
              finalizedMaterialRowIds,
              podeSelecionarMaterial,
              isFinalizadoMaterial,
            ),
          ]),
      ...dataColumns,
    ]
  }, [
    editable,
    onCellChange,
    handleDraftChange,
    handleContextMenu,
    createEnvioSelectColumn,
    modoMedicamento,
    rowSelectionAuditoria,
    onRowSelectionAuditoriaChange,
    finalizedAuditoriaRowIds,
    podeSelecionarAuditoria,
    isFinalizadoAuditoria,
    rowSelectionMaterial,
    onRowSelectionMaterialChange,
    finalizedMaterialRowIds,
    podeSelecionarMaterial,
    isFinalizadoMaterial,
  ])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getRowId: (row) => row.id,
    autoResetPageIndex: false,
    globalFilterFn: (row, _columnId, filterValue) =>
      rowMatchesFilter(row.original, String(filterValue)),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const rowsPerPageOptions = editable ? [25, 50] : [25, 50, 100, 250]

  useEffect(() => {
    if (editable && pagination.pageSize > 50) {
      setPagination((prev) => ({ ...prev, pageSize: 50 }))
    }
  }, [editable, pagination.pageSize])

  useEffect(() => {
    if (globalFilter.trim()) return
    setPagination((prev) =>
      prev.pageIndex === lastPageIndex ? prev : { ...prev, pageIndex: lastPageIndex },
    )
  }, [rows, lastPageIndex, globalFilter])

  const selectedAuditoriaCount = useMemo(
    () => rows.filter((row) => rowSelectionAuditoria[row.id] && podeSelecionarAuditoria(row)).length,
    [rows, rowSelectionAuditoria, podeSelecionarAuditoria],
  )

  const selectedMaterialCount = useMemo(
    () => rows.filter((row) => rowSelectionMaterial[row.id] && podeSelecionarMaterial(row)).length,
    [rows, rowSelectionMaterial, podeSelecionarMaterial],
  )

  const enviavelAuditoriaCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          rowSelectionAuditoria[row.id] &&
          rowPodeSerEnviadaAuditoria(row, rowIdsComPedido ?? new Set(), finalizedAuditoriaRowIds),
      ).length,
    [rows, rowSelectionAuditoria, rowIdsComPedido, finalizedAuditoriaRowIds],
  )

  const enviavelMaterialCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          rowSelectionMaterial[row.id] &&
          rowPodeSerEnviadaMaterial(row, finalizedMaterialRowIds),
      ).length,
    [rows, rowSelectionMaterial, finalizedMaterialRowIds],
  )

  const totalValorFiltrado = useMemo(() => {
    return table.getFilteredRowModel().rows.reduce(
      (sum, r) => sum + (!isLinhaPreenchida(r.original) ? 0 : r.original.valorNumerico),
      0,
    )
  }, [table, rows, globalFilter, sorting])

  const selectedValor = useMemo(() => {
    const selectedIds = new Set<string>()
    for (const [rowId, selected] of Object.entries(rowSelectionAuditoria)) {
      if (selected) selectedIds.add(rowId)
    }
    for (const [rowId, selected] of Object.entries(rowSelectionMaterial)) {
      if (selected) selectedIds.add(rowId)
    }
    return rows
      .filter((row) => selectedIds.has(row.id))
      .reduce((sum, row) => sum + row.valorNumerico, 0)
  }, [rows, rowSelectionAuditoria, rowSelectionMaterial])

  const selectAColWidth = resolvedColumnWidths['select-a'] ?? 40
  const selectSColWidth = resolvedColumnWidths['select-s'] ?? 40
  const hasAnySelection = selectedAuditoriaCount > 0 || selectedMaterialCount > 0

  const linhasPreenchidas = useMemo(
    () => rows.filter((r) => isLinhaPreenchida(r)).length,
    [rows],
  )

  const groupSpans = useMemo(() => {
    const groups: { group: string; span: number }[] = []
    let current: string = CONSUMO_MATERIAL_HEADERS[0]?.group ?? 'paciente'
    let span = 0
    for (const col of CONSUMO_MATERIAL_HEADERS) {
      if (col.group === current) {
        span++
      } else {
        groups.push({ group: current, span })
        current = col.group
        span = 1
      }
    }
    groups.push({ group: current, span })
    return groups
  }, [])

  return (
    <>
    <Paper
      elevation={0}
      className="excel-sheet"
      sx={{
        border: EXCEL_SHEET.border,
        borderRadius: 0,
        overflow: 'hidden',
        bgcolor: EXCEL_SHEET.sheetBg,
      }}
    >
      <Box className="excel-sheet-toolbar" sx={{ px: 2, py: 1.25 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: EXCEL_SHEET.text }}>
              Consumo Material Consignado
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
              <Chip
                label={fileName}
                size="small"
                variant="outlined"
                sx={{
                  fontWeight: 600,
                  maxWidth: 280,
                  borderColor: EXCEL_SHEET.borderColor,
                  bgcolor: '#fff',
                }}
              />
              <Chip
                label={`${linhasPreenchidas} lançamentos`}
                size="small"
                variant="outlined"
                sx={{ borderColor: EXCEL_SHEET.borderColor, bgcolor: '#fff' }}
              />
              {mesReferencia && (
                <Chip
                  label={mesReferencia}
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: EXCEL_SHEET.borderColor, bgcolor: '#fff' }}
                />
              )}
              {lancamentosPreenchidos !== undefined && (
                <>
                  {showPlanilhaActions && (
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        alignItems: 'center',
                        width: { xs: '100%', sm: 'auto' },
                      }}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<DeleteSweepIcon />}
                        onClick={() => setExcluirOpen(true)}
                        disabled={isExcluindo || isAdicionando || isEnviando}
                      >
                        Excluir tudo
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<PostAddIcon />}
                        onClick={openAdicionarModal}
                        disabled={isExcluindo || isAdicionando || isEnviando}
                      >
                        Adicionar planilha
                      </Button>
                      {onLimparRascunho && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<RefreshIcon />}
                          onClick={onLimparRascunho}
                          disabled={isExcluindo || isAdicionando || isEnviando}
                        >
                          Limpar rascunho
                        </Button>
                      )}
                      {onEnviarImh && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<SendIcon />}
                          onClick={onEnviarImh}
                          disabled={isEnviando || enviavelAuditoriaCount === 0}
                        >
                          {isEnviando
                            ? modoMedicamento
                              ? 'Enviando para Contabilidade/IMH...'
                              : 'Enviando para Auditoria...'
                            : modoMedicamento
                              ? `Enviar para Contabilidade/IMH (${enviavelAuditoriaCount})`
                              : `Enviar para Auditoria (${enviavelAuditoriaCount})`}
                        </Button>
                      )}
                      {onEnviarMaterial && (
                        <Button
                          size="small"
                          variant="contained"
                          color="secondary"
                          startIcon={<InventoryIcon />}
                          onClick={onEnviarMaterial}
                          disabled={isEnviando || enviavelMaterialCount === 0}
                        >
                          Enviar para Material ({enviavelMaterialCount})
                        </Button>
                      )}
                    </Box>
                  )}
                </>
              )}
              {hasAnySelection && (
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                  {selectedAuditoriaCount > 0 && (
                    <Chip
                      label={`A: ${selectedAuditoriaCount}`}
                      size="small"
                      color="primary"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                  {selectedMaterialCount > 0 && (
                    <Chip
                      label={`S: ${selectedMaterialCount}`}
                      size="small"
                      color="secondary"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                </Stack>
              )}
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 1,
              minWidth: { md: 320 },
            }}
          >
            {headerExtra}
            <TextField
              size="small"
              placeholder="Buscar NIP, nome, procedimento..."
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value)
              setPagination((prev) => ({ ...prev, pageIndex: 0 }))
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                sx: {
                  bgcolor: '#fff',
                  fontSize: '11px',
                  fontFamily: EXCEL_SHEET.fontFamily,
                },
              },
            }}
            sx={{ minWidth: { xs: '100%', md: 280 }, flex: 1 }}
          />
          </Box>
        </Box>
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        className="excel-sheet-summary"
        sx={{ px: 2, py: 0.75 }}
      >
        <Typography sx={{ fontSize: '11px', color: EXCEL_SHEET.mutedText }}>
          Total filtrado:{' '}
          <strong style={{ color: EXCEL_SHEET.text }}>{formatValorBrasileiro(totalValorFiltrado)}</strong>
        </Typography>
        {hasAnySelection && (
          <Typography sx={{ fontSize: '11px', color: EXCEL_SHEET.mutedText }}>
            Selecionados:{' '}
            <strong style={{ color: EXCEL_SHEET.text }}>{formatValorBrasileiro(selectedValor)}</strong>
          </Typography>
        )}
        {editable && (
          <Typography sx={{ fontSize: '10px', color: EXCEL_SHEET.mutedText }}>
            Clique com o botão direito para adicionar ou excluir · Arraste as bordas para redimensionar
          </Typography>
        )}
      </Stack>

      <TableContainer className="excel-sheet-grid" sx={{ maxHeight: 'min(70vh, 720px)', overflow: 'auto' }}>
        <Table
          stickyHeader
          size="small"
          sx={{ tableLayout: 'fixed', width: tableMinWidth, minWidth: tableMinWidth }}
        >
          <TableHead>
            <TableRow>
              {SELECT_COLUMN_IDS.map((columnId, index) => (
                <TableCell
                  key={columnId}
                  rowSpan={2}
                  className="excel-select-header"
                  sx={{
                    ...getColumnCellSx(
                      columnId === 'select-a' ? selectAColWidth : selectSColWidth,
                    ),
                    position: 'sticky',
                    left: index === 0 ? 0 : selectAColWidth,
                    zIndex: 4,
                    verticalAlign: 'middle',
                    textAlign: 'center',
                  }}
                >
                  {table.getHeaderGroups()[0]?.headers
                    .filter((h) => h.id === columnId)
                    .map((header) => (
                      <Box key={header.id} sx={{ display: 'flex', justifyContent: 'center' }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </Box>
                    ))}
                  <ColumnResizeHandle
                    onResizeStart={(event) => {
                      const cell = (event.currentTarget as HTMLElement).closest('th, td')
                      startColumnResize(
                        columnId,
                        event.clientX,
                        cell?.getBoundingClientRect().width ??
                          (columnId === 'select-a' ? selectAColWidth : selectSColWidth),
                      )
                    }}
                  />
                </TableCell>
              ))}
              {groupSpans.map((g) => (
                <TableCell
                  key={g.group}
                  colSpan={g.span}
                  align="center"
                  className="excel-group-header"
                  sx={{ py: 0.5 }}
                >
                  {GROUP_LABELS[g.group]}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              {table.getHeaderGroups()[0]?.headers
                .filter((h) => !SELECT_COLUMN_IDS.includes(h.id as (typeof SELECT_COLUMN_IDS)[number]))
                .map((header) => {
                  const colWidth = resolvedColumnWidths[header.id] ?? 100
                  return (
                    <TableCell
                      key={header.id}
                      className="excel-col-header"
                      sx={{
                        ...getColumnCellSx(colWidth),
                        py: 0.5,
                      }}
                    >
                      {header.column.getCanSort() ? (
                        <TableSortLabel
                          active={Boolean(header.column.getIsSorted())}
                          direction={header.column.getIsSorted() === 'desc' ? 'desc' : 'asc'}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </TableSortLabel>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                      <ColumnResizeHandle
                        onResizeStart={(event) => {
                          const cell = (event.currentTarget as HTMLElement).closest('th, td')
                          startColumnResize(
                            header.id,
                            event.clientX,
                            cell?.getBoundingClientRect().width ?? colWidth,
                          )
                        }}
                      />
                    </TableCell>
                  )
                })}
            </TableRow>
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">Nenhum lançamento corresponde à busca.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const vazia = !isLinhaPreenchida(row.original)
                const customRowHeight = getRowHeight(row.id)
                const rowSelected =
                  Boolean(rowSelectionAuditoria[row.id]) || Boolean(rowSelectionMaterial[row.id])
                return (
                <TableRow
                  key={row.id}
                  hover={false}
                  className={`excel-data-row${vazia ? ' excel-row-empty' : ''}${rowSelected ? ' excel-row-selected' : ''}`}
                  onContextMenu={(e) => handleContextMenu(e, row.id)}
                  sx={{
                    cursor: editable ? 'context-menu' : undefined,
                    height: customRowHeight,
                    minHeight: customRowHeight ?? DEFAULT_ROW_MIN_HEIGHT,
                  }}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => {
                    const colId = cell.column.id
                    const colWidth = resolvedColumnWidths[colId] ?? 100
                    const stickySx =
                      cellIndex === 0
                        ? { position: 'sticky' as const, left: 0, zIndex: 1 }
                        : cellIndex === 1
                          ? { position: 'sticky' as const, left: selectAColWidth, zIndex: 1 }
                          : {}
                    return (
                    <TableCell
                      key={cell.id}
                      onContextMenu={(e) => handleContextMenu(e, row.id)}
                      className={cellIndex <= 1 ? 'excel-cell-sticky' : undefined}
                      sx={{
                        ...getColumnCellSx(colWidth),
                        py: 0,
                        verticalAlign: 'middle',
                        overflow: 'visible',
                        textAlign: colId === 'valor' ? 'right' : 'left',
                        ...stickySx,
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      {cellIndex === 0 && (
                        <RowResizeHandle
                          onResizeStart={(event) => {
                            const tr = (event.currentTarget as HTMLElement).closest('tr')
                            const height =
                              customRowHeight ??
                              tr?.getBoundingClientRect().height ??
                              DEFAULT_ROW_MIN_HEIGHT
                            startRowResize(row.id, event.clientY, height)
                          }}
                        />
                      )}
                    </TableCell>
                  )})}
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        className="excel-sheet-pagination"
        component="div"
        count={table.getFilteredRowModel().rows.length}
        page={pagination.pageIndex}
        onPageChange={(_, page) => setPagination((prev) => ({ ...prev, pageIndex: page }))}
        rowsPerPage={pagination.pageSize}
        onRowsPerPageChange={(e) => {
          const nextSize = parseInt(e.target.value, 10)
          const nextPageIndex = globalFilter.trim()
            ? 0
            : Math.max(0, Math.ceil(filteredRowCount / nextSize) - 1)
          setPagination({ pageIndex: nextPageIndex, pageSize: nextSize })
        }}
        rowsPerPageOptions={rowsPerPageOptions}
        labelRowsPerPage="Linhas por página"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
      />
    </Paper>

    <Menu
      open={contextMenu !== null}
      onClose={closeContextMenu}
      anchorReference="anchorPosition"
      anchorPosition={
        contextMenu
          ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
          : undefined
      }
    >
      <MenuItem onClick={() => handleInserirFromMenu('above')}>
        Adicionar linha acima
      </MenuItem>
      <MenuItem onClick={() => handleInserirFromMenu('below')}>
        Adicionar linha abaixo
      </MenuItem>
      <MenuItem onClick={handleExcluirFromMenu} disabled={rows.length <= 1}>
        Excluir linha
      </MenuItem>
    </Menu>

    {showPlanilhaActions && (
      <>
        <ExcluirPlanilhaDialog
          open={excluirOpen}
          totalLancamentos={totalLancamentos}
          isDeleting={isExcluindo}
          onClose={() => setExcluirOpen(false)}
          onConfirm={handleExcluirConfirm}
        />
        <AdicionarPlanilhaModal
          open={adicionarOpen}
          isLoading={isAdicionando}
          error={addPlanilhaError}
          onClose={() => setAdicionarOpen(false)}
          onFileSelected={handleAdicionarFile}
        />
      </>
    )}

    <FinalizadoLinhaModal
      open={finalizadoModalRow !== null}
      row={finalizadoModalRow}
      canDesmarcar={Boolean(onDesfinalizarLinha)}
      onClose={closeFinalizadoModal}
      onDesmarcar={handleDesmarcarFinalizado}
    />
    </>
  )
}

export const ConsumoMaterialSpreadsheet = memo(ConsumoMaterialSpreadsheetInner)
