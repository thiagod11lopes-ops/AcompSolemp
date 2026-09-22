import {
  DeleteOutlined as DeleteIcon,
  DeleteOutlined as TrashIcon,
  EditOutlined as EditIcon,
} from '@mui/icons-material'
import {
  Box,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import {
  ANOS_PLANILHA_DISPONIVEIS,
  dataPertenceAoMes,
  getMesModeloFromParts,
  type MesConsumoModelo,
} from '@/utils/consumoMaterialTemplate'
import {
  DIV_MATERIAL_COLUNAS,
  type DivMaterialLinha,
} from '@/utils/divMaterialForm'
import '@/components/clinica/spreadsheet-excel.css'

interface DivMaterialPlanilhaPreviewProps {
  linhas: DivMaterialLinha[]
  editingLinhaId?: string | null
  selectedIds?: Set<string>
  onSelectedIdsChange?: (next: Set<string>) => void
  finalizedIds?: Set<string>
  onEditLinha?: (linhaId: string) => void
  onDeleteLinha?: (linhaId: string) => void
  onRequestClear?: () => void
}

const MESES_OPCOES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
] as const

function dash(value: string): string {
  const trimmed = value.trim()
  return trimmed || '—'
}

/** Quebra o texto a cada `size` caracteres para exibição na grade. */
function wrapEvery(value: string, size: number): string {
  const trimmed = value.trim()
  if (!trimmed) return '—'
  if (trimmed.length <= size) return trimmed
  const parts: string[] = []
  for (let i = 0; i < trimmed.length; i += size) {
    parts.push(trimmed.slice(i, i + size))
  }
  return parts.join('\n')
}

/** Conteúdo com quebra forçada (vence o nowrap do .excel-sheet-grid). */
function DescricaoMaterialCell({ text }: { text: string }) {
  return (
    <Box
      component="div"
      className="excel-cell-wrap"
      sx={{
        display: 'block',
        width: '50ch',
        maxWidth: '50ch',
        whiteSpace: 'pre-wrap !important',
        wordBreak: 'break-all',
        overflowWrap: 'anywhere',
        overflow: 'visible !important',
        lineHeight: 1.35,
      }}
    >
      {wrapEvery(text, 50)}
    </Box>
  )
}

const descricaoMaterialCellSx = {
  ...({
    border: EXCEL_SHEET.border,
    fontFamily: EXCEL_SHEET.fontFamily,
    fontSize: EXCEL_SHEET.fontSize,
    py: 0.75,
    px: 1,
    color: EXCEL_SHEET.text,
    bgcolor: EXCEL_SHEET.cellBg,
  } as const),
  width: '50ch',
  maxWidth: '50ch',
  minWidth: '50ch',
  whiteSpace: 'pre-wrap !important',
  overflow: 'visible !important',
  textOverflow: 'unset',
  wordBreak: 'break-all',
  overflowWrap: 'anywhere',
  verticalAlign: 'top' as const,
  lineHeight: 1.35,
} as const

function diasNoMes(mes: number, ano: number): number {
  return new Date(ano, mes, 0).getDate()
}

function dataPertenceAoDia(data: string, dia: number, mesModelo: MesConsumoModelo): boolean {
  if (!dataPertenceAoMes(data, mesModelo)) return false
  if (dia <= 0) return true
  const match = data.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!match) return false
  return parseInt(match[1], 10) === dia
}

function anosDisponiveis(linhas: DivMaterialLinha[]): number[] {
  const anos = new Set<number>(ANOS_PLANILHA_DISPONIVEIS)
  anos.add(new Date().getFullYear())
  for (const linha of linhas) {
    const match = linha.dataProcedimento.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (!match) continue
    const yearRaw = match[3]
    const year = yearRaw.length === 2 ? 2000 + parseInt(yearRaw, 10) : parseInt(yearRaw, 10)
    if (Number.isFinite(year)) anos.add(year)
  }
  return [...anos].sort((a, b) => b - a)
}

const cellSx = {
  border: EXCEL_SHEET.border,
  fontFamily: EXCEL_SHEET.fontFamily,
  fontSize: EXCEL_SHEET.fontSize,
  py: 0.75,
  px: 1,
  color: EXCEL_SHEET.text,
  bgcolor: EXCEL_SHEET.cellBg,
  verticalAlign: 'middle' as const,
  whiteSpace: 'nowrap' as const,
} as const

const headerSx = {
  ...cellSx,
  bgcolor: EXCEL_SHEET.headerBg,
  fontWeight: 700,
  color: EXCEL_SHEET.mutedText,
} as const

const finalizedCheckboxSx = {
  color: EXCEL_SHEET.finalizedCheck,
  '&.Mui-checked': { color: EXCEL_SHEET.finalizedCheck },
  opacity: 0.55,
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
  onEditLinha,
  onDeleteLinha,
  onRequestClear,
}: DivMaterialPlanilhaPreviewProps) {
  const [filtroMes, setFiltroMes] = useState(() => new Date().getMonth() + 1)
  const [filtroAno, setFiltroAno] = useState(() => new Date().getFullYear())
  const [filtroDia, setFiltroDia] = useState(0)
  const [mostrarTodos, setMostrarTodos] = useState(false)

  const mesFiltro = useMemo(
    () => getMesModeloFromParts(filtroMes, filtroAno),
    [filtroMes, filtroAno],
  )
  const diasOptions = useMemo(
    () => Array.from({ length: diasNoMes(filtroMes, filtroAno) }, (_, i) => i + 1),
    [filtroMes, filtroAno],
  )
  const anosOptions = useMemo(() => anosDisponiveis(linhas), [linhas])

  const linhasFiltradas = useMemo(() => {
    if (mostrarTodos) return linhas
    return linhas.filter((linha) =>
      dataPertenceAoDia(linha.dataProcedimento, filtroDia, mesFiltro),
    )
  }, [linhas, mostrarTodos, filtroDia, mesFiltro])

  const selectionEnabled = Boolean(onSelectedIdsChange)
  const selection = selectedIds ?? new Set<string>()
  const finalized = finalizedIds ?? new Set<string>()
  const selecionaveis = linhasFiltradas.filter((l) => !finalized.has(l.id))
  const allSelected =
    selecionaveis.length > 0 && selecionaveis.every((l) => selection.has(l.id))
  const someSelected = selecionaveis.some((l) => selection.has(l.id))
  const visible = linhas.length > 0
  const colCount = DIV_MATERIAL_COLUNAS.length + (selectionEnabled ? 1 : 0) + 1

  const handleFiltroMesChange = (mes: number) => {
    setFiltroMes(mes)
    if (filtroDia > diasNoMes(mes, filtroAno)) setFiltroDia(0)
  }

  const handleFiltroAnoChange = (ano: number) => {
    setFiltroAno(ano)
    if (filtroDia > diasNoMes(filtroMes, ano)) setFiltroDia(0)
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

  return (
    <Box
      sx={{
        opacity: visible ? 1 : 0.92,
        transform: visible ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 280ms ease, transform 280ms ease',
      }}
    >
      <Paper
        elevation={0}
        className="excel-sheet"
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          border: `1px solid ${EXCEL_SHEET.toolbarBorder}`,
          boxShadow: visible
            ? '0 12px 40px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)'
            : 'none',
          bgcolor: EXCEL_SHEET.sheetBg,
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
            background: `linear-gradient(180deg, ${EXCEL_SHEET.toolbarBg} 0%, #ebebeb 100%)`,
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

          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={mostrarTodos}
                onChange={(_, checked) => setMostrarTodos(checked)}
              />
            }
            label="Todos"
            sx={{
              ml: 0.5,
              mr: 0,
              '& .MuiFormControlLabel-label': { fontSize: '0.8rem', fontWeight: 600 },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 80 }} disabled={mostrarTodos}>
            <InputLabel id="div-mat-prev-dia">Dia</InputLabel>
            <Select
              labelId="div-mat-prev-dia"
              label="Dia"
              value={filtroDia}
              onChange={(e) => setFiltroDia(Number(e.target.value))}
              sx={{ height: 32, fontSize: '0.8rem' }}
            >
              <MenuItem value={0}>Todos</MenuItem>
              {diasOptions.map((dia) => (
                <MenuItem key={dia} value={dia}>
                  {String(dia).padStart(2, '0')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }} disabled={mostrarTodos}>
            <InputLabel id="div-mat-prev-mes">Mês</InputLabel>
            <Select
              labelId="div-mat-prev-mes"
              label="Mês"
              value={filtroMes}
              onChange={(e) => handleFiltroMesChange(Number(e.target.value))}
              sx={{ height: 32, fontSize: '0.8rem' }}
            >
              {MESES_OPCOES.map((mes) => (
                <MenuItem key={mes.value} value={mes.value}>
                  {mes.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 88 }} disabled={mostrarTodos}>
            <InputLabel id="div-mat-prev-ano">Ano</InputLabel>
            <Select
              labelId="div-mat-prev-ano"
              label="Ano"
              value={filtroAno}
              onChange={(e) => handleFiltroAnoChange(Number(e.target.value))}
              sx={{ height: 32, fontSize: '0.8rem' }}
            >
              {anosOptions.map((ano) => (
                <MenuItem key={ano} value={ano}>
                  {ano}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {onRequestClear ? (
            <IconButton
              size="small"
              aria-label="Apagar lançamentos Div. Material"
              onClick={onRequestClear}
              disabled={linhas.length === 0}
              sx={{ ml: 'auto', color: 'error.main' }}
            >
              <TrashIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Box>

        {!visible ? (
          <Box sx={{ px: 2.5, py: 4, textAlign: 'center', opacity: 0.55 }}>
            <Typography variant="body2" color="text.secondary">
              Importe o MODELO ou adicione lançamentos no formulário à esquerda para ver a planilha.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              p: 1.5,
              borderTop: EXCEL_SHEET.border,
              width: 'fit-content',
              maxWidth: '100%',
            }}
          >
            <Box
              className="excel-sheet-grid excel-sheet-wrap"
              sx={{
                width: 'fit-content',
                maxWidth: '100%',
                overflowX: 'auto',
                border: EXCEL_SHEET.border,
                borderRadius: 1,
                bgcolor: EXCEL_SHEET.sheetBg,
              }}
            >
              <Table size="small" sx={{ width: 'auto', tableLayout: 'auto' }}>
                <TableHead>
                  <TableRow>
                    {selectionEnabled ? (
                      <TableCell
                        sx={{
                          ...headerSx,
                          bgcolor: EXCEL_SHEET.selectHeaderBg,
                          minWidth: 52,
                          textAlign: 'center',
                          px: 0.5,
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
                    {DIV_MATERIAL_COLUNAS.map((col) => (
                      <TableCell
                        key={col.key}
                        sx={{
                          ...headerSx,
                          minWidth: col.key === 'descricaoMaterial' ? '50ch' : col.width,
                          maxWidth: col.key === 'descricaoMaterial' ? '50ch' : undefined,
                          whiteSpace:
                            col.key === 'descricaoMaterial' ? 'normal' : headerSx.whiteSpace,
                        }}
                      >
                        {col.label}
                      </TableCell>
                    ))}
                    <TableCell sx={{ ...headerSx, textAlign: 'center', minWidth: 72 }}>
                      AÇÕES
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {linhasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={colCount} sx={{ ...cellSx, color: EXCEL_SHEET.mutedText }}>
                        Nenhum registro no período filtrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    linhasFiltradas.map((linha, index) => {
                      const editing = editingLinhaId === linha.id
                      const finalizado = finalized.has(linha.id)
                      const checked = finalizado || selection.has(linha.id)
                      return (
                        <TableRow
                          key={linha.id}
                          sx={{
                            bgcolor: editing
                              ? EXCEL_SHEET.editingBg
                              : selection.has(linha.id)
                                ? EXCEL_SHEET.selectedBg
                                : undefined,
                            '& > .MuiTableCell-root': editing
                              ? { bgcolor: EXCEL_SHEET.editingBg }
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
                              }}
                            >
                              <Checkbox
                                size="small"
                                checked={checked}
                                disabled={finalizado}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(_, nextChecked) => toggleOne(linha.id, nextChecked)}
                                sx={{
                                  p: 0,
                                  ...(finalizado ? finalizedCheckboxSx : selectedCheckboxSx),
                                }}
                              />
                            </TableCell>
                          ) : null}
                          {DIV_MATERIAL_COLUNAS.map((col) =>
                            col.key === 'descricaoMaterial' ? (
                              <TableCell key={col.key} sx={descricaoMaterialCellSx}>
                                <DescricaoMaterialCell text={String(linha[col.key] ?? '')} />
                              </TableCell>
                            ) : (
                              <TableCell
                                key={col.key}
                                sx={{
                                  ...cellSx,
                                  minWidth: col.width,
                                }}
                              >
                                {dash(String(linha[col.key] ?? ''))}
                              </TableCell>
                            ),
                          )}
                          <TableCell sx={{ ...cellSx, textAlign: 'center' }}>
                            <IconButton
                              size="small"
                              aria-label={`Editar linha Div. Material ${index + 1}`}
                              onClick={() => onEditLinha?.(linha.id)}
                              sx={{ p: 0.35 }}
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              aria-label={`Excluir linha Div. Material ${index + 1}`}
                              onClick={() => onDeleteLinha?.(linha.id)}
                              sx={{ p: 0.35 }}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
