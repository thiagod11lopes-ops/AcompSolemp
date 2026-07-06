import {
  Box,
  Checkbox,
  Chip,
  InputAdornment,
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
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import {
  CONSUMO_MATERIAL_HEADERS,
  formatValorBrasileiro,
  type ConsumoMaterialRow,
} from '@/utils/consumoMaterialOds'
import { isLinhaPlaceholder } from '@/utils/consumoMaterialTemplate'

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

interface ConsumoMaterialSpreadsheetProps {
  rows: ConsumoMaterialRow[]
  fileName: string
  rowSelection: RowSelectionState
  onRowSelectionChange: (selection: RowSelectionState) => void
  mesReferencia?: string
  lancamentosPreenchidos?: number
}

export function ConsumoMaterialSpreadsheet({
  rows,
  fileName,
  rowSelection,
  onRowSelectionChange,
  mesReferencia,
  lancamentosPreenchidos,
}: ConsumoMaterialSpreadsheetProps) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo<ColumnDef<ConsumoMaterialRow>[]>(() => {
    const dataColumns: ColumnDef<ConsumoMaterialRow>[] = CONSUMO_MATERIAL_HEADERS.map(
      (col) => ({
        id: col.key,
        accessorKey: col.key,
        header: col.label,
        size: col.width,
        cell: ({ getValue, row }) => {
          const value = String(getValue() ?? '')
          const placeholder = isLinhaPlaceholder(row.original)
          if (col.key === 'valor') {
            const num = row.original.valorNumerico
            if (placeholder && !num) {
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
                  whiteSpace: 'nowrap',
                }}
              >
                {num > 0 ? formatValorBrasileiro(num) : value || '—'}
              </Typography>
            )
          }
          if (placeholder && !value) {
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
              title={value}
              sx={{
                display: 'block',
                maxWidth: col.width,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {value || '—'}
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
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }}
          />
        ),
        cell: ({ row }) => {
          const placeholder = isLinhaPlaceholder(row.original)
          return (
            <Checkbox
              size="small"
              checked={row.getIsSelected()}
              disabled={placeholder}
              onChange={row.getToggleSelectedHandler()}
            />
          )
        },
      },
      ...dataColumns,
    ]
  }, [])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater
      onRowSelectionChange(next)
    },
    enableRowSelection: (row) => !isLinhaPlaceholder(row.original),
    getRowId: (row) => row.id,
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase()
      if (!q) return true
      const r = row.original
      return [
        r.nip,
        r.nome,
        r.procedimento,
        r.fornecedor,
        r.cirurgiao,
        r.materiais,
        r.empenho,
        r.valor,
      ].some((v) => v.toLowerCase().includes(q))
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  })

  const selectedCount = Object.keys(rowSelection).length
  const filteredRows = table.getFilteredRowModel().rows
  const totalValorFiltrado = filteredRows.reduce(
    (sum, r) => sum + (isLinhaPlaceholder(r.original) ? 0 : r.original.valorNumerico),
    0,
  )
  const selectedValor = table
    .getSelectedRowModel()
    .rows.reduce((sum, r) => sum + r.original.valorNumerico, 0)

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
          px: 2.5,
          py: 2,
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
            gap: 2,
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
                label={`${rows.filter((r) => !isLinhaPlaceholder(r)).length} lançamentos`}
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
                <Chip
                  label={`${rows.filter((r) => isLinhaPlaceholder(r)).length} linhas livres`}
                  size="small"
                  variant="outlined"
                  sx={{ color: 'white', borderColor: alpha('#fff', 0.35) }}
                />
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

          <TextField
            size="small"
            placeholder="Buscar NIP, nome, procedimento..."
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value)
              table.setPageIndex(0)
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
            sx={{ minWidth: { xs: '100%', md: 320 } }}
          />
        </Box>
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ px: 2.5, py: 1.5, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}
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
      </Stack>

      <TableContainer sx={{ maxHeight: 'min(70vh, 720px)' }}>
        <Table stickyHeader size="small" sx={{ minWidth: 2400 }}>
          <TableHead>
            <TableRow>
              <TableCell
                rowSpan={2}
                sx={{
                  width: 48,
                  bgcolor: '#072A66',
                  borderBottom: 'none',
                  position: 'sticky',
                  left: 0,
                  zIndex: 4,
                }}
              />
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
                  return (
                    <TableCell
                      key={header.id}
                      sx={{
                        bgcolor: alpha(GROUP_COLORS[group], 0.92),
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        letterSpacing: 0.4,
                        whiteSpace: 'nowrap',
                        minWidth: colDef?.width,
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
                const placeholder = isLinhaPlaceholder(row.original)
                return (
                <TableRow
                  key={row.id}
                  hover={!placeholder}
                  selected={row.getIsSelected()}
                  sx={(theme) => ({
                    bgcolor: placeholder
                      ? alpha(theme.palette.action.disabled, 0.06)
                      : index % 2 === 0
                        ? 'background.paper'
                        : alpha(theme.palette.primary.main, 0.03),
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    },
                    '&:hover': {
                      bgcolor: placeholder
                        ? alpha(theme.palette.action.disabled, 0.08)
                        : alpha(theme.palette.primary.main, 0.06),
                    },
                  })}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <TableCell
                      key={cell.id}
                      sx={{
                        py: 0.75,
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
                    </TableCell>
                  ))}
                </TableRow>
              )})
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={table.getFilteredRowModel().rows.length}
        page={table.getState().pagination.pageIndex}
        onPageChange={(_, page) => table.setPageIndex(page)}
        rowsPerPage={table.getState().pagination.pageSize}
        onRowsPerPageChange={(e) => table.setPageSize(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[25, 50, 100, 250]}
        labelRowsPerPage="Linhas por página"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
      />
    </Paper>
  )
}
