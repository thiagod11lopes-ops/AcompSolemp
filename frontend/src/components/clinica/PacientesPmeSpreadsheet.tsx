import { memo, useCallback, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
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
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
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
import { ConmedEscolherAbaModal } from '@/components/clinica/ConmedEscolherAbaModal'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import '@/components/clinica/spreadsheet-excel.css'
import {
  PACIENTES_PME_HEADERS,
  clonePacientesPmeSeed,
  createEmptyPacientePmeRow,
  formatPacientePmeUpper,
  type PacientePmeColunaKey,
  type PacientePmeRow,
} from '@/utils/pacientesPme'
import {
  findPacientesPmeSheetIndex,
  loadPacientesPmeSheetsFromFile,
  mergePacientesPmeImport,
  parsePacientesPmeFromGrid,
} from '@/utils/pacientesPmeImport'
import type { SpreadsheetSheetImport } from '@/utils/consumoMaterialOds'

const ACOES_COL_WIDTH = 72

interface PacientesPmeSpreadsheetProps {
  value: PacientePmeRow[]
  onChange: (next: PacientePmeRow[]) => void
}

function PacientesPmeSpreadsheetInner({ value, onChange }: PacientesPmeSpreadsheetProps) {
  const rows = value
  const rowsRef = useRef(rows)
  rowsRef.current = rows
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
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)
  const [sheetPicker, setSheetPicker] = useState<{
    open: boolean
    fileName: string
    sheets: SpreadsheetSheetImport[]
    initialSheetIndex: number
  }>({ open: false, fileName: '', sheets: [], initialSheetIndex: 0 })
  const [feedback, setFeedback] = useState<{
    open: boolean
    severity: 'success' | 'error'
    message: string
  }>({ open: false, severity: 'success', message: '' })

  const handleCellChange = useCallback(
    (rowId: string, field: string, nextValue: string) => {
      const key = field as PacientePmeColunaKey
      const formatted =
        key === 'nome' || key === 'postoGradTitular' || key === 'vinculo'
          ? formatPacientePmeUpper(nextValue)
          : nextValue.trim()
      onChange(
        rowsRef.current.map((row) => (row.id === rowId ? { ...row, [key]: formatted } : row)),
      )
    },
    [onChange],
  )

  const handleContextMenu = useCallback((event: MouseEvent, rowId: string) => {
    event.preventDefault()
    setContextMenu({ mouseX: event.clientX, mouseY: event.clientY, rowId })
  }, [])

  const handleAddRow = (afterRowId?: string | null) => {
    const empty = createEmptyPacientePmeRow()
    if (!afterRowId) {
      onChange([empty, ...rowsRef.current])
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
      return
    }
    const idx = rowsRef.current.findIndex((row) => row.id === afterRowId)
    if (idx < 0) {
      onChange([empty, ...rowsRef.current])
      return
    }
    const next = [...rowsRef.current]
    next.splice(idx + 1, 0, empty)
    onChange(next)
  }

  const handleDeleteRow = (rowId: string) => {
    onChange(rowsRef.current.filter((row) => row.id !== rowId))
    setContextMenu(null)
  }

  const handleRestoreSeed = () => {
    onChange(clonePacientesPmeSeed())
    setFeedback({
      open: true,
      severity: 'success',
      message: 'Lista de pacientes restaurada a partir do banco original.',
    })
  }

  const applyImportedSheet = (sheet: SpreadsheetSheetImport) => {
    const parsed = parsePacientesPmeFromGrid(sheet.rows)
    if (parsed.length === 0) {
      setFeedback({
        open: true,
        severity: 'error',
        message:
          'Não foi possível identificar pacientes nessa aba. Verifique as colunas NOME, NIP e VÍNCULO.',
      })
      return
    }
    onChange(mergePacientesPmeImport(rowsRef.current, parsed))
    setFeedback({
      open: true,
      severity: 'success',
      message: `Planilha importada${sheet.nome ? ` (aba “${sheet.nome}”)` : ''}: ${parsed.length} paciente(s).`,
    })
  }

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImporting(true)
    try {
      const sheets = await loadPacientesPmeSheetsFromFile(file)
      if (sheets.length === 0) {
        setFeedback({
          open: true,
          severity: 'error',
          message: 'O arquivo não contém abas legíveis.',
        })
        return
      }
      if (sheets.length === 1) {
        applyImportedSheet(sheets[0])
        return
      }
      const preferred = findPacientesPmeSheetIndex(sheets)
      setSheetPicker({
        open: true,
        fileName: file.name,
        sheets,
        initialSheetIndex: preferred >= 0 ? preferred : 0,
      })
    } catch (err) {
      setFeedback({
        open: true,
        severity: 'error',
        message: err instanceof Error ? err.message : 'Falha ao ler a planilha.',
      })
    } finally {
      setImporting(false)
    }
  }

  const columns = useMemo<ColumnDef<PacientePmeRow>[]>(
    () => [
      ...PACIENTES_PME_HEADERS.map(
        (header): ColumnDef<PacientePmeRow> => ({
          id: header.key,
          accessorKey: header.key,
          header: header.label,
          size: header.width,
          cell: ({ row, getValue }) => (
            <SpreadsheetEditableCell
              rowId={row.original.id}
              field={header.key}
              value={String(getValue() ?? '')}
              onCellChange={handleCellChange}
              onContextMenu={handleContextMenu}
            />
          ),
        }),
      ),
      {
        id: 'acoes',
        header: 'AÇÕES',
        size: ACOES_COL_WIDTH,
        enableSorting: false,
        cell: ({ row }) => (
          <Tooltip title="Excluir paciente">
            <IconButton
              size="small"
              color="error"
              aria-label={`Excluir paciente ${row.index + 1}`}
              onClick={() => handleDeleteRow(row.original.id)}
              sx={{ p: 0.35 }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
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
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue ?? '')
        .trim()
        .toLowerCase()
      if (!q) return true
      const original = row.original
      return [
        original.nome,
        original.nipUsuario,
        original.nipTitular,
        original.postoGradTitular,
        original.vinculo,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    },
  })

  const cellSx = {
    border: EXCEL_SHEET.border,
    fontFamily: EXCEL_SHEET.fontFamily,
    fontSize: EXCEL_SHEET.fontSize,
    py: 0.35,
    px: 0.75,
    color: EXCEL_SHEET.text,
    bgcolor: EXCEL_SHEET.cellBg,
  } as const

  const headerSx = {
    ...cellSx,
    bgcolor: EXCEL_SHEET.headerBg,
    fontWeight: 700,
    color: EXCEL_SHEET.mutedText,
  } as const

  return (
    <Paper
      elevation={0}
      className="excel-sheet"
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        border: `1px solid ${EXCEL_SHEET.toolbarBorder}`,
        bgcolor: EXCEL_SHEET.sheetBg,
      }}
    >
      <Box
        className="excel-sheet-toolbar"
        sx={{
          px: 1.5,
          py: 1,
          background: `linear-gradient(180deg, ${EXCEL_SHEET.toolbarBg} 0%, #ebebeb 100%)`,
        }}
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
            <Typography
              sx={{
                fontFamily: EXCEL_SHEET.fontFamily,
                fontWeight: 800,
                fontSize: 13,
                color: EXCEL_SHEET.selectedCheck,
              }}
            >
              Banco de dados IMH — Pacientes PME
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
              <Chip
                size="small"
                variant="outlined"
                label={`${rows.length} paciente(s)`}
                sx={{ height: 22, fontWeight: 600 }}
              />
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<AddIcon />}
                onClick={() => handleAddRow()}
                sx={{ textTransform: 'none', fontWeight: 700, height: 26 }}
              >
                Nova linha
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<UploadFileOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={() => importInputRef.current?.click()}
                disabled={importing}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  height: 26,
                  borderColor: EXCEL_SHEET.selectedCheck,
                  color: EXCEL_SHEET.selectedCheck,
                  bgcolor: '#fff',
                }}
              >
                {importing ? 'Importando…' : 'Importar planilha'}
              </Button>
              <Button
                size="small"
                variant="text"
                startIcon={<RestartAltIcon />}
                onClick={handleRestoreSeed}
                sx={{ textTransform: 'none', height: 26 }}
              >
                Restaurar banco original
              </Button>
            </Box>
          </Box>
          <TextField
            size="small"
            placeholder="Buscar nome, NIP, vínculo…"
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
            sx={{ minWidth: { md: 260 }, bgcolor: '#fff' }}
          />
        </Box>
      </Box>

      <input
        ref={importInputRef}
        type="file"
        accept=".xlsx,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet"
        hidden
        onChange={handleImportFileChange}
      />

      <TableContainer sx={{ maxHeight: 'min(70vh, 720px)' }}>
        <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', minWidth: 960 }}>
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell
                    key={header.id}
                    sx={{
                      ...headerSx,
                      width: header.getSize(),
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                    }}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <TableSortLabel
                        active={Boolean(header.column.getIsSorted())}
                        direction={header.column.getIsSorted() || 'asc'}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableSortLabel>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={PACIENTES_PME_HEADERS.length + 1}
                  sx={{ ...cellSx, color: EXCEL_SHEET.mutedText, py: 4, textAlign: 'center' }}
                >
                  Nenhum paciente. Importe o banco ODS ou restaure a lista original.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={{ '&:hover td': { bgcolor: EXCEL_SHEET.hoverBg } }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      sx={{
                        ...cellSx,
                        width: cell.column.getSize(),
                        ...(cell.column.id === 'nome'
                          ? { whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
                          : null),
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
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
        onRowsPerPageChange={(e) =>
          setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })
        }
        rowsPerPageOptions={[25, 50, 100, 200]}
        labelRowsPerPage="Linhas"
      />

      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
        }
      >
        <MenuItem
          onClick={() => {
            handleAddRow(contextMenu?.rowId)
            setContextMenu(null)
          }}
        >
          Inserir linha abaixo
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (contextMenu) handleDeleteRow(contextMenu.rowId)
          }}
        >
          Excluir linha
        </MenuItem>
      </Menu>

      <ConmedEscolherAbaModal
        open={sheetPicker.open}
        sheetNames={sheetPicker.sheets.map((s) => s.nome)}
        fileName={sheetPicker.fileName}
        initialSheetIndex={sheetPicker.initialSheetIndex}
        description={
          sheetPicker.fileName
            ? `O arquivo “${sheetPicker.fileName}” tem várias abas. Escolha qual aba deseja importar.`
            : 'O arquivo tem várias abas. Escolha qual aba deseja importar.'
        }
        onCancel={() =>
          setSheetPicker({ open: false, fileName: '', sheets: [], initialSheetIndex: 0 })
        }
        onConfirm={(sheetIndex) => {
          const sheet = sheetPicker.sheets[sheetIndex]
          setSheetPicker({ open: false, fileName: '', sheets: [], initialSheetIndex: 0 })
          if (sheet) applyImportedSheet(sheet)
        }}
      />

      <Snackbar
        open={feedback.open}
        autoHideDuration={5000}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={feedback.severity}
          variant="filled"
          onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </Paper>
  )
}

export const PacientesPmeSpreadsheet = memo(PacientesPmeSpreadsheetInner)
