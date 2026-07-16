import { memo, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import { SpreadsheetEditableCell } from '@/components/clinica/SpreadsheetEditableCell'
import { MedicamentoPrecoEditModal } from '@/components/clinica/MedicamentoPrecoEditModal'
import { getColumnCellSx } from '@/components/clinica/SpreadsheetResizeHandle'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import '@/components/clinica/spreadsheet-excel.css'
import { medicamentosPrecosService } from '@/services/medicamentosPrecosService'
import {
  createMedicamentoPrecoVazio,
  formatPrecoReferenciaMedicamento,
  MEDICAMENTOS_PRECOS_HEADERS,
  type MedicamentoPrecoColunaKey,
  type MedicamentoPrecoRow,
} from '@/utils/medicamentosPrecos'
import { measurePlainColumnWidths } from '@/utils/spreadsheetColumnWidth'

const ACOES_COL_WIDTH = 88

function MedicamentosPrecosSpreadsheetInner() {
  const [rows, setRows] = useState<MedicamentoPrecoRow[]>(() => medicamentosPrecosService.getRows())
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number
    mouseY: number
    rowId: string
  } | null>(null)
  const [editRow, setEditRow] = useState<MedicamentoPrecoRow | null>(null)
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  useEffect(
    () => () => {
      if (persistTimer.current) clearTimeout(persistTimer.current)
    },
    [],
  )

  const persistRows = useCallback((next: MedicamentoPrecoRow[]) => {
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      persistTimer.current = null
      medicamentosPrecosService.saveRows(next)
    }, 250)
  }, [])

  const updateRows = useCallback(
    (updater: (prev: MedicamentoPrecoRow[]) => MedicamentoPrecoRow[]) => {
      setRows((prev) => {
        const next = updater(prev)
        persistRows(next)
        return next
      })
    },
    [persistRows],
  )

  const handleCellChange = useCallback(
    (rowId: string, field: string, value: string) => {
      const key = field as MedicamentoPrecoColunaKey
      updateRows((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row
          const nextValue =
            key === 'precoReferencia' ? formatPrecoReferenciaMedicamento(value) || value : value
          return { ...row, [key]: nextValue }
        }),
      )
    },
    [updateRows],
  )

  const handleContextMenu = useCallback((event: MouseEvent, rowId: string) => {
    event.preventDefault()
    setContextMenu({ mouseX: event.clientX, mouseY: event.clientY, rowId })
  }, [])

  const handleAdicionarLinha = useCallback(
    (position: 'above' | 'below' | 'end') => {
      updateRows((prev) => {
        const nova = createMedicamentoPrecoVazio()
        if (position === 'end' || !contextMenu) return [...prev, nova]
        const index = prev.findIndex((row) => row.id === contextMenu.rowId)
        if (index < 0) return [...prev, nova]
        const insertAt = position === 'above' ? index : index + 1
        return [...prev.slice(0, insertAt), nova, ...prev.slice(insertAt)]
      })
      setContextMenu(null)
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    },
    [contextMenu, updateRows],
  )

  const handleExcluirLinhaById = useCallback(
    (rowId: string) => {
      updateRows((prev) => {
        if (prev.length <= 1) return prev
        return prev.filter((row) => row.id !== rowId)
      })
      setContextMenu(null)
      setEditRow((current) => (current?.id === rowId ? null : current))
    },
    [updateRows],
  )

  const handleExcluirLinha = useCallback(() => {
    if (!contextMenu) return
    handleExcluirLinhaById(contextMenu.rowId)
  }, [contextMenu, handleExcluirLinhaById])

  const handleRestaurarSeed = useCallback(() => {
    const restored = medicamentosPrecosService.resetToSeed()
    setRows(restored)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    setGlobalFilter('')
  }, [])

  const handleSaveEdit = useCallback(
    (updated: MedicamentoPrecoRow) => {
      updateRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
      setEditRow(null)
    },
    [updateRows],
  )

  const columns = useMemo<ColumnDef<MedicamentoPrecoRow>[]>(
    () => [
      ...MEDICAMENTOS_PRECOS_HEADERS.map((col) => ({
        id: col.key,
        accessorKey: col.key,
        header: col.label,
        cell: ({ getValue, row }: { getValue: () => unknown; row: { original: MedicamentoPrecoRow } }) => {
          const value = String(getValue() ?? '')
          return (
            <SpreadsheetEditableCell
              rowId={row.original.id}
              field={col.key}
              value={value}
              onCellChange={handleCellChange}
              onContextMenu={handleContextMenu}
            />
          )
        },
      })),
      {
        id: 'acoes',
        header: 'Ações',
        enableSorting: false,
        cell: ({ row }) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.25,
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
          >
            <Tooltip title="Editar">
              <IconButton
                size="small"
                aria-label="Editar linha"
                onClick={() => setEditRow(row.original)}
                sx={{ color: 'primary.main' }}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Excluir">
              <span>
                <IconButton
                  size="small"
                  aria-label="Excluir linha"
                  disabled={rowsRef.current.length <= 1}
                  onClick={() => handleExcluirLinhaById(row.original.id)}
                  sx={{ color: 'error.main' }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [handleCellChange, handleContextMenu, handleExcluirLinhaById],
  )

  const contentColumnWidths = useMemo(
    () =>
      measurePlainColumnWidths(
        rows as unknown as Array<Record<string, unknown>>,
        MEDICAMENTOS_PRECOS_HEADERS,
        true,
      ),
    [rows],
  )

  const tableMinWidth = useMemo(
    () =>
      MEDICAMENTOS_PRECOS_HEADERS.reduce(
        (sum, col) => sum + (contentColumnWidths[col.key] ?? col.width),
        0,
      ) + ACOES_COL_WIDTH,
    [contentColumnWidths],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue ?? '')
        .trim()
        .toLowerCase()
      if (!q) return true
      const original = row.original
      return [original.neb, original.medicamento, original.uf, original.precoReferencia]
        .join(' ')
        .toLowerCase()
        .includes(q)
    },
  })

  const resolveColWidth = (columnId: string) => {
    if (columnId === 'acoes') return ACOES_COL_WIDTH
    return (
      contentColumnWidths[columnId] ??
      MEDICAMENTOS_PRECOS_HEADERS.find((h) => h.key === columnId)?.width ??
      100
    )
  }

  return (
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
              Lista de medicamentos com preços
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
              <Chip
                label={`${rows.length} medicamentos`}
                size="small"
                variant="outlined"
                sx={{ borderColor: EXCEL_SHEET.borderColor, bgcolor: '#fff' }}
              />
              <Chip
                label="Preço referência 2026"
                size="small"
                variant="outlined"
                sx={{ borderColor: EXCEL_SHEET.borderColor, bgcolor: '#fff' }}
              />
              <Chip
                label="Editável"
                size="small"
                color="success"
                variant="outlined"
                sx={{ bgcolor: '#fff' }}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => handleAdicionarLinha('end')}
              >
                Adicionar linha
              </Button>
              <Button
                size="small"
                variant="text"
                startIcon={<RestartAltIcon />}
                onClick={handleRestaurarSeed}
              >
                Restaurar lista original
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Use a coluna Ações para editar ou excluir · Botão direito para inserir linhas ·
              Alterações salvas automaticamente
            </Typography>
          </Box>
          <TextField
            size="small"
            placeholder="Buscar NEB, medicamento, UF…"
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
              },
            }}
            sx={{
              minWidth: { xs: '100%', md: 280 },
              bgcolor: '#fff',
              '& .MuiOutlinedInput-root': { bgcolor: '#fff' },
              '& .MuiInputBase-input': { color: '#111827' },
            }}
          />
        </Box>
      </Box>

      <TableContainer className="excel-sheet-grid" sx={{ maxHeight: 'calc(100vh - 260px)' }}>
        <Table
          stickyHeader
          size="small"
          sx={{
            tableLayout: 'fixed',
            width: tableMinWidth,
            minWidth: tableMinWidth,
            maxWidth: tableMinWidth,
          }}
        >
          <colgroup>
            {MEDICAMENTOS_PRECOS_HEADERS.map((header) => {
              const width = contentColumnWidths[header.key] ?? header.width
              return (
                <col
                  key={header.key}
                  style={{
                    width,
                    minWidth: width,
                  }}
                />
              )
            })}
            <col style={{ width: ACOES_COL_WIDTH, minWidth: ACOES_COL_WIDTH }} />
          </colgroup>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const colWidth = resolveColWidth(header.id)
                  const canSort = header.column.getCanSort()
                  return (
                    <TableCell
                      key={header.id}
                      className="excel-col-header"
                      sx={{
                        ...getColumnCellSx(colWidth),
                        bgcolor: EXCEL_SHEET.headerBg,
                        color: EXCEL_SHEET.text,
                        fontFamily: EXCEL_SHEET.fontFamily,
                        fontSize: EXCEL_SHEET.fontSize,
                        fontWeight: 700,
                        borderColor: EXCEL_SHEET.borderColor,
                        textAlign: header.id === 'acoes' ? 'center' : 'left',
                      }}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <TableSortLabel
                          active={header.column.getIsSorted() !== false}
                          direction={
                            header.column.getIsSorted() === 'desc' ? 'desc' : 'asc'
                          }
                          onClick={header.column.getToggleSortingHandler()}
                          sx={{ color: 'inherit !important' }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </TableSortLabel>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                hover={false}
                className="excel-data-row"
                onContextMenu={(event) => handleContextMenu(event, row.original.id)}
                sx={{
                  cursor: 'context-menu',
                }}
              >
                {row.getVisibleCells().map((cell) => {
                  const colWidth = resolveColWidth(cell.column.id)
                  return (
                    <TableCell
                      key={cell.id}
                      sx={{
                        ...getColumnCellSx(colWidth),
                        py: cell.column.id === 'acoes' ? 0.25 : 0,
                        borderColor: EXCEL_SHEET.borderColor,
                        fontFamily: EXCEL_SHEET.fontFamily,
                        fontSize: EXCEL_SHEET.fontSize,
                        color: EXCEL_SHEET.text,
                        textAlign:
                          cell.column.id === 'precoReferencia' || cell.column.id === 'acoes'
                            ? 'right'
                            : 'left',
                        ...(cell.column.id === 'acoes' ? { textAlign: 'center' } : null),
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        className="excel-sheet-pagination"
        count={table.getFilteredRowModel().rows.length}
        page={pagination.pageIndex}
        onPageChange={(_, page) => setPagination((prev) => ({ ...prev, pageIndex: page }))}
        rowsPerPage={pagination.pageSize}
        onRowsPerPageChange={(e) =>
          setPagination({ pageIndex: 0, pageSize: parseInt(e.target.value, 10) })
        }
        rowsPerPageOptions={[25, 50, 100, 200]}
        labelRowsPerPage="Linhas"
        sx={{
          borderTop: EXCEL_SHEET.border,
          bgcolor: EXCEL_SHEET.toolbarBg,
          color: EXCEL_SHEET.text,
        }}
      />

      <Menu
        open={Boolean(contextMenu)}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
        }
      >
        <MenuItem onClick={() => handleAdicionarLinha('above')}>Inserir linha acima</MenuItem>
        <MenuItem onClick={() => handleAdicionarLinha('below')}>Inserir linha abaixo</MenuItem>
        <MenuItem
          onClick={() => {
            const row = rowsRef.current.find((item) => item.id === contextMenu?.rowId)
            if (row) setEditRow(row)
            setContextMenu(null)
          }}
        >
          Editar linha
        </MenuItem>
        <MenuItem onClick={handleExcluirLinha} disabled={rowsRef.current.length <= 1}>
          Excluir linha
        </MenuItem>
      </Menu>

      <MedicamentoPrecoEditModal
        open={Boolean(editRow)}
        row={editRow}
        onClose={() => setEditRow(null)}
        onSave={handleSaveEdit}
      />
    </Paper>
  )
}

export const MedicamentosPrecosSpreadsheet = memo(MedicamentosPrecosSpreadsheetInner)
