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
  type Theme,
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
import { isLinhaPreenchida, rowPodeSerSelecionada } from '@/utils/consumoMaterialTemplate'
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

const DEFAULT_ROW_MIN_HEIGHT = 40

const GROUP_LABELS: Record<string, string> = {
  paciente: 'Paciente',
  clinico: 'Dados clínicos',
  financeiro: 'Financeiro',
}

const GROUP_COLORS: Record<string, string> = {
  paciente: '#0B3D91',
  clinico: '#1565C0',
  financeiro: '#2E7D32',
}

const FINALIZED_CHECKBOX_OPACITY = 0.42

const finalizedCheckboxSx = {
  color: (theme: Theme) => alpha(theme.palette.success.main, FINALIZED_CHECKBOX_OPACITY),
  '&.Mui-checked': {
    color: (theme: Theme) => alpha(theme.palette.success.main, FINALIZED_CHECKBOX_OPACITY),
  },
  '&.Mui-disabled': {
    color: (theme: Theme) => alpha(theme.palette.success.main, FINALIZED_CHECKBOX_OPACITY),
  },
  '&.Mui-disabled.Mui-checked': {
    color: (theme: Theme) => alpha(theme.palette.success.main, FINALIZED_CHECKBOX_OPACITY),
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

interface ConsumoMaterialSpreadsheetProps {
  measureRows?: ConsumoMaterialRow[]
  rows: ConsumoMaterialRow[]
  fileName: string
  rowSelection: RowSelectionState
  onRowSelectionChange: (selection: RowSelectionState) => void
  mesReferencia?: string
  lancamentosPreenchidos?: number
  rowIdsComPedido?: Set<string>
  finalizedRowIds?: Set<string>
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
  isEnviando?: boolean
  editable?: boolean
  onCellChange?: (rowId: string, field: ConsumoMaterialColunaKey, value: string) => void
  onInserirLinha?: (rowId: string, position: InserirLinhaConsumoPosicao) => void
  onExcluirLinha?: (rowId: string) => void
  onDesfinalizarLinha?: (rowId: string) => void
  headerExtra?: ReactNode
}

function ConsumoMaterialSpreadsheetInner({
  measureRows,
  rows,
  fileName,
  rowSelection,
  onRowSelectionChange,
  mesReferencia,
  lancamentosPreenchidos,
  rowIdsComPedido: _rowIdsComPedido,
  finalizedRowIds,
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

  const headerActionSx = {
    fontWeight: 600,
    color: 'white',
    borderColor: alpha('#fff', 0.4),
    '&:hover': {
      borderColor: 'white',
      bgcolor: alpha('#fff', 0.1),
    },
  } as const

  const headerContainedSx = {
    fontWeight: 700,
    bgcolor: alpha('#fff', 0.2),
    color: 'white',
    boxShadow: 'none',
    '&:hover': {
      bgcolor: alpha('#fff', 0.3),
      boxShadow: 'none',
    },
  } as const

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
    (event: MouseEvent, row: ConsumoMaterialRow) => {
      event.stopPropagation()
      event.preventDefault()
      setFinalizadoModalRow(row)
    },
    [],
  )

  const closeFinalizadoModal = useCallback(() => {
    setFinalizadoModalRow(null)
  }, [])

  const handleDesmarcarFinalizado = useCallback(() => {
    if (!finalizadoModalRow || !onDesfinalizarLinha) return
    onDesfinalizarLinha(finalizadoModalRow.id)
    setFinalizadoModalRow(null)
  }, [finalizadoModalRow, onDesfinalizarLinha])

  const isFinalizado = useCallback(
    (row: ConsumoMaterialRow) => Boolean(finalizedRowIds?.has(row.id)),
    [finalizedRowIds],
  )

  const podeSelecionar = useCallback(
    (row: ConsumoMaterialRow) => rowPodeSerSelecionada(row) && !isFinalizado(row),
    [isFinalizado],
  )

  const handleRowSelectionChange = useCallback(
    (updater: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater
      if (finalizedRowIds?.size) {
        for (const rowId of finalizedRowIds) {
          next[rowId] = true
        }
      }
      onRowSelectionChange(next)
    },
    [rowSelection, finalizedRowIds, onRowSelectionChange],
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
              return (
                <Box
                  sx={{
                    minHeight: 20,
                    borderBottom: '1px dashed',
                    borderColor: 'divider',
                  }}
                />
              )
            }
            return (
              <Typography
                component="span"
                variant="body2"
                sx={{
                  fontFamily: '"JetBrains Mono", "Roboto Mono", monospace',
                  fontWeight: 600,
                  color: num > 0 ? 'success.dark' : 'text.secondary',
                  ...cellContentSx,
                }}
              >
                {num > 0 ? formatValorBrasileiro(num) : toSingleLine(value) || '—'}
              </Typography>
            )
          }
          if (!isLinhaPreenchida(row.original) && !value) {
            return (
              <Box
                sx={{
                  minHeight: 20,
                  borderBottom: '1px dashed',
                  borderColor: 'divider',
                }}
              />
            )
          }
          return (
            <Typography
              component="span"
              variant="body2"
              sx={{
                ...cellContentSx,
              }}
            >
              {toSingleLine(value) || '—'}
            </Typography>
          )
        },
      }),
    )

    return [
      {
        id: 'select',
        size: 48,
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            size="small"
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onClick={(e) => e.stopPropagation()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }}
          />
        ),
        cell: ({ row }) => {
          const finalizado = isFinalizado(row.original)
          const selecionavel = podeSelecionar(row.original)
          return (
            <Checkbox
              size="small"
              checked={finalizado || row.getIsSelected()}
              disabled={!selecionavel && !finalizado}
              onClick={(e) => {
                if (finalizado) handleFinalizadoCheckboxClick(e, row.original)
              }}
              onChange={(e) => {
                if (finalizado) return
                row.getToggleSelectedHandler()(e)
              }}
              sx={{
                ...(finalizado ? finalizedCheckboxSx : undefined),
                ...(finalizado ? { cursor: 'pointer' } : undefined),
              }}
            />
          )
        },
      },
      ...dataColumns,
    ]
  }, [editable, onCellChange, handleDraftChange, handleContextMenu, handleFinalizadoCheckboxClick, podeSelecionar, isFinalizado])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, rowSelection, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onRowSelectionChange: handleRowSelectionChange,
    enableRowSelection: (row) => podeSelecionar(row.original),
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

  const selectedCount = useMemo(
    () =>
      table
        .getSelectedRowModel()
        .rows.filter((r) => podeSelecionar(r.original)).length,
    [table, rowSelection, rows, podeSelecionar],
  )

  const totalValorFiltrado = useMemo(() => {
    return table.getFilteredRowModel().rows.reduce(
      (sum, r) => sum + (!isLinhaPreenchida(r.original) ? 0 : r.original.valorNumerico),
      0,
    )
  }, [table, rows, globalFilter, sorting])

  const selectedValor = useMemo(
    () =>
      table
        .getSelectedRowModel()
        .rows.reduce((sum, r) => sum + r.original.valorNumerico, 0),
    [table, rowSelection, rows],
  )

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
      sx={(theme) => ({
        border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        boxShadow: '0 8px 32px rgba(11, 61, 145, 0.08)',
      })}
    >
      <Box
        sx={(theme) => ({
          px: 2,
          py: 1.25,
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 55%, ${theme.palette.primary.light} 100%)`,
          color: 'white',
        })}
      >
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
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.2 }}>
              Consumo Material Consignado
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
              <Chip
                label={fileName}
                size="small"
                sx={{
                  bgcolor: alpha('#fff', 0.15),
                  color: 'white',
                  fontWeight: 600,
                  maxWidth: 280,
                }}
              />
              <Chip
                label={`${linhasPreenchidas} lançamentos`}
                size="small"
                sx={{ bgcolor: alpha('#fff', 0.12), color: 'white' }}
              />
              {mesReferencia && (
                <Chip
                  label={mesReferencia}
                  size="small"
                  sx={{ bgcolor: alpha('#fff', 0.1), color: 'white' }}
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
                        sx={headerActionSx}
                      >
                        Excluir tudo
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<PostAddIcon />}
                        onClick={openAdicionarModal}
                        disabled={isExcluindo || isAdicionando || isEnviando}
                        sx={headerContainedSx}
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
                          sx={headerActionSx}
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
                          disabled={isEnviando || selectedCount === 0}
                          sx={headerContainedSx}
                        >
                          {isEnviando ? 'Enviando para Auditoria...' : `Enviar para Auditoria (${selectedCount})`}
                        </Button>
                      )}
                      {onEnviarMaterial && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<InventoryIcon />}
                          onClick={onEnviarMaterial}
                          disabled={isEnviando || selectedCount === 0}
                          sx={{
                            ...headerContainedSx,
                            bgcolor: alpha('#fff', 0.28),
                            '&:hover': { bgcolor: alpha('#fff', 0.38), boxShadow: 'none' },
                          }}
                        >
                          Enviar para Material ({selectedCount})
                        </Button>
                      )}
                    </Box>
                  )}
                </>
              )}
              {selectedCount > 0 && (
                <Chip
                  label={`${selectedCount} selecionado(s)`}
                  size="small"
                  color="secondary"
                  sx={{ fontWeight: 700 }}
                />
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
                    <SearchIcon sx={{ color: alpha('#fff', 0.8) }} />
                  </InputAdornment>
                ),
                sx: {
                  bgcolor: alpha('#fff', 0.12),
                  borderRadius: 2,
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#fff', 0.25) },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#fff', 0.45) },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                  '& input::placeholder': { color: alpha('#fff', 0.7), opacity: 1 },
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
        sx={{ px: 2, py: 1, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}
      >
        <Typography variant="body2" color="text.secondary">
          Total filtrado:{' '}
          <strong>{formatValorBrasileiro(totalValorFiltrado)}</strong>
        </Typography>
        {selectedCount > 0 && (
          <Typography variant="body2" color="primary.main">
            Selecionados:{' '}
            <strong>{formatValorBrasileiro(selectedValor)}</strong>
          </Typography>
        )}
        {editable && (
          <Typography variant="caption" color="text.secondary">
            Clique com o botão direito para adicionar ou excluir · Arraste as bordas para redimensionar
          </Typography>
        )}
      </Stack>

      <TableContainer sx={{ maxHeight: 'min(70vh, 720px)', overflow: 'auto' }}>
        <Table
          stickyHeader
          size="small"
          sx={{ tableLayout: 'fixed', width: tableMinWidth, minWidth: tableMinWidth }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                rowSpan={2}
                sx={{
                  ...getColumnCellSx(resolvedColumnWidths.select ?? 48),
                  bgcolor: '#072A66',
                  borderBottom: 'none',
                  position: 'sticky',
                  left: 0,
                  zIndex: 4,
                  verticalAlign: 'middle',
                  textAlign: 'center',
                }}
              >
                {table.getHeaderGroups()[0]?.headers
                  .filter((h) => h.id === 'select')
                  .map((header) => (
                    <Box key={header.id} sx={{ display: 'flex', justifyContent: 'center' }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </Box>
                  ))}
                <ColumnResizeHandle
                  onResizeStart={(event) => {
                    const cell = (event.currentTarget as HTMLElement).closest('th, td')
                    startColumnResize(
                      'select',
                      event.clientX,
                      cell?.getBoundingClientRect().width ?? resolvedColumnWidths.select,
                    )
                  }}
                />
              </TableCell>
              {groupSpans.map((g) => (
                <TableCell
                  key={g.group}
                  colSpan={g.span}
                  align="center"
                  sx={{
                    bgcolor: GROUP_COLORS[g.group],
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    py: 0.75,
                    borderRight: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  {GROUP_LABELS[g.group]}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              {table.getHeaderGroups()[0]?.headers
                .filter((h) => h.id !== 'select')
                .map((header) => {
                  const colDef = CONSUMO_MATERIAL_HEADERS.find((c) => c.key === header.id)
                  const group = colDef?.group ?? 'paciente'
                  const colWidth = resolvedColumnWidths[header.id] ?? 100
                  return (
                    <TableCell
                      key={header.id}
                      sx={{
                        ...getColumnCellSx(colWidth),
                        bgcolor: alpha(GROUP_COLORS[group], 0.92),
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        letterSpacing: 0.4,
                        whiteSpace: 'nowrap',
                        py: 1,
                        borderBottom: `2px solid ${GROUP_COLORS[group]}`,
                      }}
                    >
                      {header.column.getCanSort() ? (
                        <TableSortLabel
                          active={Boolean(header.column.getIsSorted())}
                          direction={header.column.getIsSorted() === 'desc' ? 'desc' : 'asc'}
                          onClick={header.column.getToggleSortingHandler()}
                          sx={{
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': { color: 'white !important' },
                          }}
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
              table.getRowModel().rows.map((row, index) => {
                const vazia = !isLinhaPreenchida(row.original)
                const customRowHeight = getRowHeight(row.id)
                return (
                <TableRow
                  key={row.id}
                  hover
                  selected={row.getIsSelected()}
                  onContextMenu={(e) => handleContextMenu(e, row.id)}
                  sx={(theme) => ({
                    cursor: editable ? 'context-menu' : undefined,
                    height: customRowHeight,
                    minHeight: customRowHeight ?? DEFAULT_ROW_MIN_HEIGHT,
                    bgcolor: vazia
                      ? alpha(theme.palette.action.disabled, 0.06)
                      : index % 2 === 0
                        ? 'background.paper'
                        : alpha(theme.palette.primary.main, 0.03),
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    },
                    '&:hover': {
                      bgcolor: vazia
                        ? alpha(theme.palette.action.disabled, 0.08)
                        : alpha(theme.palette.primary.main, 0.06),
                    },
                  })}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => {
                    const colId = cell.column.id
                    const colWidth = resolvedColumnWidths[colId] ?? 100
                    return (
                    <TableCell
                      key={cell.id}
                      onContextMenu={(e) => handleContextMenu(e, row.id)}
                      sx={{
                        ...getColumnCellSx(colWidth),
                        py: editable ? 0.5 : 0.75,
                        verticalAlign: 'top',
                        overflow: 'visible',
                        ...(cellIndex === 0
                          ? {
                              position: 'sticky',
                              left: 0,
                              zIndex: 1,
                              bgcolor: 'inherit',
                              borderRight: 1,
                              borderColor: 'divider',
                            }
                          : {}),
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
