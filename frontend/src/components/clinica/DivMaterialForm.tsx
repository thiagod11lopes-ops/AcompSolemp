import {
  Alert,
  Box,
  Checkbox,
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
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import { useMemo, useState } from 'react'
import type { ConmedComrjFormData, Empresa } from '@/types'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import {
  ANOS_PLANILHA_DISPONIVEIS,
  dataPertenceAoMes,
  getMesModeloFromParts,
  type MesConsumoModelo,
} from '@/utils/consumoMaterialTemplate'
import {
  buildDivMaterialLinhas,
  DIV_MATERIAL_COLUNAS,
  type DivMaterialLinha,
} from '@/utils/divMaterialForm'
import '@/components/clinica/spreadsheet-excel.css'

interface DivMaterialFormProps {
  consumoRows: ConsumoMaterialRow[]
  conmed?: ConmedComrjFormData
  empresas?: Empresa[]
  selectedIds?: Set<string>
  onSelectedIdsChange?: (next: Set<string>) => void
  finalizedIds?: Set<string>
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
  py: 0.5,
  px: 0.75,
  color: EXCEL_SHEET.text,
  bgcolor: EXCEL_SHEET.cellBg,
  verticalAlign: 'middle' as const,
} as const

const headerSx = {
  ...cellSx,
  bgcolor: EXCEL_SHEET.headerBg,
  fontWeight: 700,
  color: EXCEL_SHEET.mutedText,
  whiteSpace: 'nowrap' as const,
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

export function DivMaterialForm({
  consumoRows,
  conmed,
  empresas = [],
  selectedIds,
  onSelectedIdsChange,
  finalizedIds,
  onRequestClear,
}: DivMaterialFormProps) {
  const [filtroMes, setFiltroMes] = useState(() => new Date().getMonth() + 1)
  const [filtroAno, setFiltroAno] = useState(() => new Date().getFullYear())
  const [filtroDia, setFiltroDia] = useState(0)
  const [mostrarTodos, setMostrarTodos] = useState(false)

  const linhas = useMemo(
    () =>
      buildDivMaterialLinhas({
        consumoRows,
        conmed,
        empresas,
      }),
    [consumoRows, conmed, empresas],
  )

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

  const mesReferenciaLabel = useMemo(() => {
    if (mostrarTodos) return 'todos os períodos'
    const mesNome = MESES_OPCOES.find((m) => m.value === filtroMes)?.label ?? String(filtroMes)
    if (filtroDia > 0) return `${String(filtroDia).padStart(2, '0')}/${mesNome}/${filtroAno}`
    return `${mesNome}/${filtroAno}`
  }, [mostrarTodos, filtroDia, filtroMes, filtroAno])

  const selectionEnabled = Boolean(onSelectedIdsChange)
  const selection = selectedIds ?? new Set<string>()
  const finalized = finalizedIds ?? new Set<string>()
  const selecionaveis = linhasFiltradas.filter((l) => !finalized.has(l.id))
  const allSelected =
    selecionaveis.length > 0 && selecionaveis.every((l) => selection.has(l.id))
  const someSelected = selecionaveis.some((l) => selection.has(l.id))

  const handleFiltroMesChange = (mes: number) => {
    setFiltroMes(mes)
    const maxDia = diasNoMes(mes, filtroAno)
    if (filtroDia > maxDia) setFiltroDia(0)
  }

  const handleFiltroAnoChange = (ano: number) => {
    setFiltroAno(ano)
    const maxDia = diasNoMes(filtroMes, ano)
    if (filtroDia > maxDia) setFiltroDia(0)
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

  const emptyHint =
    linhas.length > 0 && linhasFiltradas.length === 0
      ? `Nenhum processo em ${mesReferenciaLabel}. Altere o dia/mês/ano do filtro ou marque Todos.`
      : undefined

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Alert severity="info" sx={{ py: 0.5 }}>
        Somente leitura — preenchida automaticamente pela planilha MODELO importada. Mapa de Sala →
        Vale de sala; Processo → Mapa; Vigência → Vigência; Fornecedor → nome (CNPJ à parte).
        Marque o checklist para enviar à Confecção de Solemp.
      </Alert>

      <Paper
        variant="outlined"
        className="spreadsheet-excel-scroll"
        sx={{
          borderColor: EXCEL_SHEET.borderColor,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderBottom: EXCEL_SHEET.border,
            bgcolor: EXCEL_SHEET.headerBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 13, fontFamily: EXCEL_SHEET.fontFamily }}>
            Div. Material — processos por NIP / data
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
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
                mr: 0.5,
                ml: 0,
                '& .MuiFormControlLabel-label': { fontSize: '0.85rem', fontWeight: 600 },
              }}
            />
            <FormControl size="small" sx={{ minWidth: 88 }} disabled={mostrarTodos}>
              <InputLabel id="div-mat-filtro-dia-label">Dia</InputLabel>
              <Select
                labelId="div-mat-filtro-dia-label"
                label="Dia"
                value={filtroDia}
                onChange={(e) => setFiltroDia(Number(e.target.value))}
              >
                <MenuItem value={0}>Todos</MenuItem>
                {diasOptions.map((dia) => (
                  <MenuItem key={dia} value={dia}>
                    {String(dia).padStart(2, '0')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }} disabled={mostrarTodos}>
              <InputLabel id="div-mat-filtro-mes-label">Mês</InputLabel>
              <Select
                labelId="div-mat-filtro-mes-label"
                label="Mês"
                value={filtroMes}
                onChange={(e) => handleFiltroMesChange(Number(e.target.value))}
              >
                {MESES_OPCOES.map((mes) => (
                  <MenuItem key={mes.value} value={mes.value}>
                    {mes.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 96 }} disabled={mostrarTodos}>
              <InputLabel id="div-mat-filtro-ano-label">Ano</InputLabel>
              <Select
                labelId="div-mat-filtro-ano-label"
                label="Ano"
                value={filtroAno}
                onChange={(e) => handleFiltroAnoChange(Number(e.target.value))}
              >
                {anosOptions.map((ano) => (
                  <MenuItem key={ano} value={ano}>
                    {ano}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              {linhasFiltradas.length} de {linhas.length} registro(s)
              {selectionEnabled && selection.size > 0 ? ` · ${selection.size} marcado(s)` : ''}
            </Typography>
            {onRequestClear ? (
              <IconButton
                size="small"
                aria-label="Apagar lançamentos Div. Material"
                onClick={onRequestClear}
                disabled={linhas.length === 0}
                sx={{ color: 'error.main' }}
              >
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            ) : null}
          </Box>
        </Box>

        {linhas.length === 0 ? (
          <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Nenhum paciente encontrado. Cadastre lançamentos na aba Consumo Material Consignado
              (ou CONMED) para preencher esta tabela automaticamente.
            </Typography>
          </Box>
        ) : linhasFiltradas.length === 0 ? (
          <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {emptyHint}
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 'min(70vh, 720px)' }}>
            <Table stickyHeader size="small" sx={{ minWidth: 1800 }}>
              <TableHead>
                <TableRow>
                  {selectionEnabled ? (
                    <TableCell
                      sx={{
                        ...headerSx,
                        bgcolor: EXCEL_SHEET.selectHeaderBg,
                        minWidth: 56,
                        textAlign: 'center',
                        top: 0,
                        zIndex: 3,
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
                      sx={{ ...headerSx, minWidth: col.width, top: 0, zIndex: 2 }}
                    >
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {linhasFiltradas.map((linha) => {
                  const finalizado = finalized.has(linha.id)
                  const checked = finalizado || selection.has(linha.id)
                  return (
                    <TableRow
                      key={linha.id}
                      hover
                      sx={{
                        bgcolor: selection.has(linha.id) ? EXCEL_SHEET.selectedBg : undefined,
                      }}
                    >
                      {selectionEnabled ? (
                        <TableCell
                          sx={{
                            ...cellSx,
                            bgcolor: EXCEL_SHEET.selectHeaderBg,
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
                      {DIV_MATERIAL_COLUNAS.map((col) => (
                        <TableCell
                          key={col.key}
                          sx={{
                            ...cellSx,
                            minWidth: col.width,
                            whiteSpace: col.key === 'descricaoMaterial' ? 'normal' : 'nowrap',
                          }}
                        >
                          {dash(String(linha[col.key] ?? ''))}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  )
}
