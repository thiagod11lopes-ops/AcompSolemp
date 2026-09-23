import {
  DeleteOutlined as DeleteIcon,
  DeleteOutlined as TrashIcon,
  DescriptionOutlined as GerarDocIcon,
  EditOutlined as EditIcon,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Checkbox,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { GerarDocumentoModal } from '@/components/clinica/GerarDocumentoModal'
import { PlanilhaDataFiltros } from '@/components/clinica/PlanilhaDataFiltros'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import {
  DIV_MATERIAL_COLUNAS,
  type DivMaterialLinha,
} from '@/utils/divMaterialForm'
import { downloadGerarDocumento } from '@/utils/gerarDocumentoTabela'
import {
  linhaPassaNoFiltroData,
  type PlanilhaDataFiltro,
} from '@/utils/planilhaDataFiltro'
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
  dataFiltro: PlanilhaDataFiltro
  onDataFiltroChange: (next: PlanilhaDataFiltro) => void
}

function dash(value: string): string {
  const trimmed = value.trim()
  return trimmed || '—'
}

const PT_VOGAIS = new Set(
  'aeiouáéíóúâêôãõàäëïöüyAEIOUÁÉÍÓÚÂÊÔÃÕÀÄËÏÖÜY'.split(''),
)

/** Dígrafos que não se separam na silabação. */
const PT_DIGRAFOS = ['ch', 'lh', 'nh', 'rr', 'ss', 'gu', 'qu'] as const

function isPtVogal(ch: string): boolean {
  return PT_VOGAIS.has(ch)
}

/**
 * Separação silábica aproximada (PT-BR) para quebra de linha.
 * Evita cortar dígrafos e tenta manter ditongos juntos.
 */
function splitSilabasPt(word: string): string[] {
  if (!word) return []
  if (word.length <= 2) return [word]

  const lower = word.toLowerCase()
  // Marca dígrafos como um único “caractere” lógico
  type Unit = { text: string; vowel: boolean }
  const units: Unit[] = []
  let i = 0
  while (i < word.length) {
    const two = lower.slice(i, i + 2)
    const dig = PT_DIGRAFOS.find((d) => two === d)
    if (dig) {
      units.push({ text: word.slice(i, i + 2), vowel: false })
      i += 2
      continue
    }
    const ch = word[i]
    units.push({ text: ch, vowel: isPtVogal(lower[i]) })
    i += 1
  }

  // Núcleos = sequências de vogais (ditongo/tritongo)
  const nuclei: number[] = []
  for (let u = 0; u < units.length; u++) {
    if (!units[u].vowel) continue
    if (u > 0 && units[u - 1].vowel) continue
    nuclei.push(u)
  }
  if (nuclei.length <= 1) return [word]

  const breaks: number[] = [] // índices em units onde começa a próxima sílaba
  for (let n = 1; n < nuclei.length; n++) {
    const prev = nuclei[n - 1]
    const curr = nuclei[n]
    // quantas unidades vogais no núcleo anterior
    let prevNucleusEnd = prev
    while (prevNucleusEnd + 1 < curr && units[prevNucleusEnd + 1].vowel) {
      prevNucleusEnd += 1
    }
    const consStart = prevNucleusEnd + 1
    const consCount = curr - consStart
    if (consCount <= 0) {
      breaks.push(curr)
    } else if (consCount === 1) {
      // VCV → consoante com a sílaba seguinte
      breaks.push(consStart)
    } else {
      // VCC+V → 1ª consoante com a anterior, resto com a seguinte
      breaks.push(consStart + 1)
    }
  }

  const silabas: string[] = []
  let start = 0
  for (const b of breaks) {
    silabas.push(units.slice(start, b).map((u) => u.text).join(''))
    start = b
  }
  silabas.push(units.slice(start).map((u) => u.text).join(''))
  return silabas.filter(Boolean)
}

/**
 * Quebra perto de `target` caracteres, respeitando palavras/sílabas.
 * Pode ultrapassar o alvo para não cortar sílaba incorretamente.
 */
function wrapDescricaoMaterial(value: string, target = 50): string {
  const flat = value.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim()
  if (!flat) return '—'

  const words = flat.split(' ').filter(Boolean)
  const lines: string[] = []
  let current = ''

  const pushCurrent = () => {
    if (current) lines.push(current)
    current = ''
  }

  const wrapLongWord = (word: string) => {
    const silabas = splitSilabasPt(word)
    let part = ''
    for (let s = 0; s < silabas.length; s++) {
      const sil = silabas[s]
      const next = part + sil
      const hasMore = s < silabas.length - 1
      if (part && next.length > target && hasMore) {
        lines.push(`${part}-`)
        part = sil
      } else {
        part = next
      }
    }
    return part
  }

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= target) {
      current = candidate
      continue
    }

    if (!current) {
      current = word.length <= target ? word : wrapLongWord(word)
      continue
    }

    pushCurrent()
    current = word.length <= target ? word : wrapLongWord(word)
  }
  pushCurrent()
  return lines.join('\n')
}

/**
 * Descrição alinhada à esquerda; quebra por sílaba/palavra (~50, podendo ultrapassar).
 */
function DescricaoMaterialCell({ text }: { text: string }) {
  return (
    <Box
      component="div"
      lang="pt-BR"
      sx={{
        display: 'block',
        textAlign: 'left',
        whiteSpace: 'pre !important',
        wordBreak: 'normal !important',
        overflowWrap: 'normal !important',
        overflow: 'visible !important',
        lineHeight: 1.35,
      }}
    >
      {wrapDescricaoMaterial(text, 50)}
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
  textAlign: 'left' as const,
  whiteSpace: 'pre !important',
  overflow: 'visible !important',
  textOverflow: 'unset',
  wordBreak: 'normal !important',
  overflowWrap: 'normal !important',
  verticalAlign: 'middle' as const,
  lineHeight: 1.35,
} as const

const cellSx = {
  border: EXCEL_SHEET.border,
  fontFamily: EXCEL_SHEET.fontFamily,
  fontSize: EXCEL_SHEET.fontSize,
  py: 0.75,
  px: 1,
  color: EXCEL_SHEET.text,
  bgcolor: EXCEL_SHEET.cellBg,
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
  whiteSpace: 'nowrap' as const,
} as const

const headerSx = {
  ...cellSx,
  bgcolor: EXCEL_SHEET.headerBg,
  fontWeight: 700,
  color: EXCEL_SHEET.mutedText,
  position: 'sticky' as const,
  top: 0,
  zIndex: 2,
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
  dataFiltro,
  onDataFiltroChange,
}: DivMaterialPlanilhaPreviewProps) {
  const [gerarOpen, setGerarOpen] = useState(false)
  const datas = useMemo(() => linhas.map((l) => l.dataProcedimento), [linhas])
  const linhasFiltradas = useMemo(
    () => linhas.filter((linha) => linhaPassaNoFiltroData(linha.dataProcedimento, dataFiltro)),
    [linhas, dataFiltro],
  )

  const selectionEnabled = Boolean(onSelectedIdsChange)
  const selection = selectedIds ?? new Set<string>()
  const finalized = finalizedIds ?? new Set<string>()
  const selecionaveis = linhasFiltradas.filter((l) => !finalized.has(l.id))
  const allSelected =
    selecionaveis.length > 0 && selecionaveis.every((l) => selection.has(l.id))
  const someSelected = selecionaveis.some((l) => selection.has(l.id))
  const visible = linhas.length > 0
  const colCount = DIV_MATERIAL_COLUNAS.length + (selectionEnabled ? 1 : 0) + 1
  const tableMinWidth =
    DIV_MATERIAL_COLUNAS.reduce(
      (sum, col) => sum + (col.key === 'descricaoMaterial' ? 280 : col.width),
      0,
    ) +
    (selectionEnabled ? 52 : 0) +
    72

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

          <PlanilhaDataFiltros
            idPrefix="div-mat-prev"
            value={dataFiltro}
            onChange={onDataFiltroChange}
            datas={datas}
          />

          <Button
            size="small"
            variant="outlined"
            startIcon={<GerarDocIcon sx={{ fontSize: 16 }} />}
            onClick={() => setGerarOpen(true)}
            disabled={linhasFiltradas.length === 0}
            sx={{
              ml: 0.5,
              height: 26,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            Gerar Documento
          </Button>

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
            className="excel-sheet-grid"
            sx={{
              p: 1.5,
              borderTop: EXCEL_SHEET.border,
              width: '100%',
              maxWidth: '100%',
              // Viewport fixo: barra horizontal fica na base da área visível,
              // sem precisar rolar até o fim da planilha.
              maxHeight: 'min(70vh, calc(100vh - 220px))',
              overflowX: 'auto',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarGutter: 'stable',
              '&::-webkit-scrollbar': {
                height: 10,
                width: 10,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(15, 23, 42, 0.28)',
                borderRadius: 999,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(15, 23, 42, 0.06)',
              },
            }}
          >
            <Box
              sx={{
                width: 'max-content',
                minWidth: '100%',
                border: EXCEL_SHEET.border,
                borderRadius: 1,
                bgcolor: EXCEL_SHEET.sheetBg,
              }}
            >
              <Table
                size="small"
                stickyHeader
                sx={{
                  width: tableMinWidth,
                  minWidth: tableMinWidth,
                  tableLayout: 'fixed',
                }}
              >
                <TableHead>
                  <TableRow>
                    {selectionEnabled ? (
                      <TableCell
                        sx={{
                          ...headerSx,
                          bgcolor: EXCEL_SHEET.selectHeaderBg,
                          width: 52,
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
                    {DIV_MATERIAL_COLUNAS.map((col) => {
                      const colWidth = col.key === 'descricaoMaterial' ? 280 : col.width
                      return (
                        <TableCell
                          key={col.key}
                          sx={{
                            ...headerSx,
                            width: colWidth,
                            minWidth: colWidth,
                          }}
                        >
                          {col.label}
                        </TableCell>
                      )
                    })}
                    <TableCell
                      sx={{ ...headerSx, textAlign: 'center', width: 72, minWidth: 72 }}
                    >
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
                                width: 52,
                                minWidth: 52,
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
                              <TableCell
                                key={col.key}
                                sx={{ ...descricaoMaterialCellSx, width: 280, minWidth: 280 }}
                              >
                                <DescricaoMaterialCell text={String(linha[col.key] ?? '')} />
                              </TableCell>
                            ) : (
                              <TableCell
                                key={col.key}
                                sx={{
                                  ...cellSx,
                                  width: col.width,
                                  minWidth: col.width,
                                }}
                              >
                                {dash(String(linha[col.key] ?? ''))}
                              </TableCell>
                            ),
                          )}
                          <TableCell
                            sx={{ ...cellSx, textAlign: 'center', width: 72, minWidth: 72 }}
                          >
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

      <GerarDocumentoModal
        open={gerarOpen}
        disabled={linhasFiltradas.length === 0}
        onClose={() => setGerarOpen(false)}
        onConfirm={async (formato) => {
          await downloadGerarDocumento(
            {
              titulo: 'Divisão de Material',
              fileBaseName: 'Div-Material',
              headers: DIV_MATERIAL_COLUNAS.map((c) => c.label),
              columnWidths: DIV_MATERIAL_COLUNAS.map((c) => c.width),
              rows: linhasFiltradas.map((linha) =>
                DIV_MATERIAL_COLUNAS.map((c) => String(linha[c.key] ?? '').trim()),
              ),
            },
            formato,
          )
        }}
      />
    </Box>
  )
}
