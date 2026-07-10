import { memo, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  Box,
  Button,
  Chip,
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
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
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

  const handleExcluirLinha = useCallback(() => {
    if (!contextMenu) return
    updateRows((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((row) => row.id !== contextMenu.rowId)
    })
    setContextMenu(null)
  }, [contextMenu, updateRows])

  const handleRestaurarSeed = useCallback(() => {
    const restored = medicamentosPrecosService.resetToSeed()
    setRows(restored)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    setGlobalFilter('')
  }, [])

  const columns = useMemo<ColumnDef<MedicamentoPrecoRow>[]>(
    () =>
      MEDICAMENTOS_PRECOS_HEADERS.map((col) => ({
        id: col.key,
        accessorKey: col.key,
        header: col.label,
        size: col.width,
        cell: ({ getValue, row }) => {
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
    [handleCellChange, handleContextMenu],
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

  const tableMinWidth = MEDICAMENTOS_PRECOS_HEADERS.reduce((sum, col) => sum + col.width, 0)

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
              Clique nas células para editar · Botão direito para inserir ou excluir · Alterações
              salvas automaticamente
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

      <TableContainer sx={{ maxHeight: 'calc(100vh - 260px)' }}>
        <Table stickyHeader size="small" sx={{ minWidth: tableMinWidth }}>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell
                    key={header.id}
                    className="excel-header-cell"
                    sx={{
                      width: header.column.getSize(),
                      minWidth: header.column.getSize(),
                      bgcolor: EXCEL_SHEET.headerBg,
                      color: EXCEL_SHEET.text,
                      fontFamily: EXCEL_SHEET.fontFamily,
                      fontSize: EXCEL_SHEET.fontSize,
                      fontWeight: 700,
                      borderColor: EXCEL_SHEET.borderColor,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {header.isPlaceholder ? null : (
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
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                hover
                onContextMenu={(event) => handleContextMenu(event, row.original.id)}
                sx={{
                  bgcolor: EXCEL_SHEET.cellBg,
                  '&:hover': { bgcolor: EXCEL_SHEET.hoverBg },
                  cursor: 'context-menu',
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    sx={{
                      width: cell.column.getSize(),
                      minWidth: cell.column.getSize(),
                      borderColor: EXCEL_SHEET.borderColor,
                      py: 0,
                      px: 0.5,
                      fontFamily: EXCEL_SHEET.fontFamily,
                      fontSize: EXCEL_SHEET.fontSize,
                      color: EXCEL_SHEET.text,
                      bgcolor: 'inherit',
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
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
        <MenuItem onClick={handleExcluirLinha} disabled={rowsRef.current.length <= 1}>
          Excluir linha
        </MenuItem>
      </Menu>
    </Paper>
  )
}

export const MedicamentosPrecosSpreadsheet = memo(MedicamentosPrecosSpreadsheetInner)
