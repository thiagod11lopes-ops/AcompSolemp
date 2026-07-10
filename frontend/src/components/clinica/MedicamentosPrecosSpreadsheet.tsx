import { memo, useMemo, useState } from 'react'
import {
  Box,
  Chip,
  InputAdornment,
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
import seedData from '@/data/medicamentosPrecosSeed.json'
import {
  MEDICAMENTOS_PRECOS_HEADERS,
  type MedicamentoPrecoRow,
} from '@/utils/medicamentosPrecos'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import '@/components/clinica/spreadsheet-excel.css'

const ROWS = seedData as MedicamentoPrecoRow[]

function MedicamentosPrecosSpreadsheetInner() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })

  const columns = useMemo<ColumnDef<MedicamentoPrecoRow>[]>(
    () =>
      MEDICAMENTOS_PRECOS_HEADERS.map((col) => ({
        id: col.key,
        accessorKey: col.key,
        header: col.label,
        size: col.width,
        cell: ({ getValue }) => {
          const value = String(getValue() ?? '')
          const isPreco = col.key === 'precoReferencia'
          return (
            <Typography
              component="span"
              className={isPreco ? 'excel-cell-number' : undefined}
              sx={{
                fontFamily: EXCEL_SHEET.fontFamily,
                fontSize: EXCEL_SHEET.fontSize,
                fontWeight: 400,
                color: EXCEL_SHEET.text,
                display: 'block',
                whiteSpace: 'nowrap',
              }}
            >
              {value || '\u00A0'}
            </Typography>
          )
        },
      })),
    [],
  )

  const table = useReactTable({
    data: ROWS,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              <Chip
                label={`${ROWS.length} medicamentos`}
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
            </Box>
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
                sx={{
                  bgcolor: EXCEL_SHEET.cellBg,
                  '&:hover': { bgcolor: EXCEL_SHEET.hoverBg },
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    sx={{
                      width: cell.column.getSize(),
                      minWidth: cell.column.getSize(),
                      borderColor: EXCEL_SHEET.borderColor,
                      py: 0.5,
                      px: 1,
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
    </Paper>
  )
}

export const MedicamentosPrecosSpreadsheet = memo(MedicamentosPrecosSpreadsheetInner)
