import {
  Alert,
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
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

export function DivMaterialForm({
  consumoRows,
  conmed,
  empresas = [],
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

  const emptyHint =
    linhas.length > 0 && linhasFiltradas.length === 0
      ? `Nenhum processo em ${mesReferenciaLabel}. Altere o dia/mês/ano do filtro ou marque Todos.`
      : undefined

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Alert severity="info" sx={{ py: 0.5 }}>
        Somente leitura — espelha automaticamente o Consumo Material Consignado e o CONMED COMRJ
        pela NIP do paciente. NIPs iguais são separados pela data do procedimento.
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
            </Typography>
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
                {linhasFiltradas.map((linha) => (
                  <TableRow key={linha.id} hover>
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
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  )
}
