import {
  DeleteOutlined as DeleteIcon,
  DeleteOutlined as TrashIcon,
  DescriptionOutlined as GerarDocIcon,
  EditOutlined as EditIcon,
  UploadFileOutlined as UploadFileIcon,
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
import type { ImhAbaFormData } from '@/types'
import { GerarDocumentoModal } from '@/components/clinica/GerarDocumentoModal'
import { PlanilhaDataFiltros } from '@/components/clinica/PlanilhaDataFiltros'
import {
  PlanilhaExpandButton,
  PlanilhaFullscreenDialog,
  usePlanilhaExpand,
} from '@/components/clinica/PlanilhaExpandControls'
import { PlanilhaFitWidth } from '@/components/clinica/PlanilhaFitWidth'
import {
  PlanilhaExpandedCellContent,
  usePlanilhaColunaHover,
} from '@/components/clinica/planilhaColunaHover'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import {
  IMH_ABA_COLUNAS,
  IMH_ABA_HOSPITAL,
  calcImhSomasValorEIndenizar,
  imhFormHasPreviewContent,
  imhNumeroCpChip,
} from '@/utils/imhAbaForm'
import { formatValorBrasileiro } from '@/utils/consumoMaterialOds'
import { downloadGerarDocumento } from '@/utils/gerarDocumentoTabela'
import {
  linhaPassaNoFiltroData,
  type PlanilhaDataFiltro,
} from '@/utils/planilhaDataFiltro'
import '@/components/clinica/spreadsheet-excel.css'

interface ImhAbaPlanilhaPreviewProps {
  value: ImhAbaFormData
  editingLinhaId?: string | null
  importing?: boolean
  selectedImhIds?: Set<string>
  onSelectedImhIdsChange?: (next: Set<string>) => void
  onImportClick?: () => void
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

const cellSx = {
  border: EXCEL_SHEET.border,
  fontFamily: EXCEL_SHEET.fontFamily,
  fontSize: EXCEL_SHEET.fontSize,
  fontWeight: EXCEL_SHEET.fontWeight,
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
  fontWeight: EXCEL_SHEET.fontWeightBold,
  color: EXCEL_SHEET.mutedText,
} as const

const titleTextSx = {
  fontFamily: EXCEL_SHEET.fontFamily,
  fontWeight: 800,
  fontSize: 13,
  color: EXCEL_SHEET.text,
  lineHeight: 1.35,
} as const

const finalizedCheckboxSx = {
  color: EXCEL_SHEET.finalizedCheck,
  '&.Mui-checked': { color: EXCEL_SHEET.finalizedCheck },
  opacity: 0.55,
} as const

const devolvidoCheckboxSx = {
  color: EXCEL_SHEET.devolvidoCheck,
  '&.Mui-checked': { color: EXCEL_SHEET.devolvidoCheck },
} as const

const selectedCheckboxSx = {
  color: EXCEL_SHEET.selectedCheck,
  '&.Mui-checked': { color: EXCEL_SHEET.selectedCheck },
} as const

export function ImhAbaPlanilhaPreview({
  value,
  editingLinhaId = null,
  importing = false,
  selectedImhIds,
  onSelectedImhIdsChange,
  onImportClick,
  onEditLinha,
  onDeleteLinha,
  onRequestClear,
  dataFiltro,
  onDataFiltroChange,
}: ImhAbaPlanilhaPreviewProps) {
  const [gerarOpen, setGerarOpen] = useState(false)
  const { expanded, setExpanded } = usePlanilhaExpand()
  const visible = imhFormHasPreviewContent(value)
  const selectionEnabled = Boolean(onSelectedImhIdsChange)
  const actionsEnabled = Boolean(onEditLinha || onDeleteLinha)
  const {
    resolveColWidth,
    isColHovered,
    colHoverHandlers,
    selectionWidth,
    actionsWidth,
  } = usePlanilhaColunaHover(expanded, IMH_ABA_COLUNAS, {
    selectionEnabled,
    actionsEnabled,
    descricaoKey: 'descricao',
  })
  const selection = selectedImhIds ?? new Set<string>()
  const finalizedIds = new Set(value.finalizedImhIds ?? [])
  const devolvidosIds = useMemo(
    () => new Set(value.devolvidosImhIds ?? []),
    [value.devolvidosImhIds],
  )
  const datas = useMemo(() => value.linhas.map((l) => l.data), [value.linhas])
  const linhasFiltradas = useMemo(
    () => value.linhas.filter((linha) => linhaPassaNoFiltroData(linha.data, dataFiltro)),
    [value.linhas, dataFiltro],
  )
  const somas = useMemo(
    () => calcImhSomasValorEIndenizar(linhasFiltradas),
    [linhasFiltradas],
  )
  const selecionaveis = linhasFiltradas.filter((l) => !finalizedIds.has(l.id))
  const allSelected =
    selecionaveis.length > 0 && selecionaveis.every((l) => selection.has(l.id))
  const someSelected = selecionaveis.some((l) => selection.has(l.id))
  const colCount =
    IMH_ABA_COLUNAS.length + (selectionEnabled ? 1 : 0) + (actionsEnabled ? 1 : 0)
  const cellFontSize = expanded ? '10px' : EXCEL_SHEET.fontSize
  const cellFontWeight = expanded ? EXCEL_SHEET.fontWeightBold : EXCEL_SHEET.fontWeight

  const toggleAll = (checked: boolean) => {
    if (!onSelectedImhIdsChange) return
    const next = new Set(selection)
    for (const linha of selecionaveis) {
      if (checked) next.add(linha.id)
      else next.delete(linha.id)
    }
    onSelectedImhIdsChange(next)
  }

  const toggleOne = (linhaId: string, checked: boolean) => {
    if (!onSelectedImhIdsChange || finalizedIds.has(linhaId)) return
    const next = new Set(selection)
    if (checked) next.add(linhaId)
    else next.delete(linhaId)
    onSelectedImhIdsChange(next)
  }

  const sheet = (
      <Paper
        elevation={0}
        className={expanded ? 'excel-sheet excel-sheet-expanded' : 'excel-sheet'}
        sx={{
          borderRadius: expanded ? 0 : 2,
          overflow: 'hidden',
          border: `1px solid ${EXCEL_SHEET.toolbarBorder}`,
          boxShadow:
            expanded || !visible
              ? 'none'
              : '0 12px 40px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)',
          bgcolor: EXCEL_SHEET.sheetBg,
          ...(expanded
            ? {
                flex: 1,
                height: '100%',
                width: '100%',
                maxWidth: '100%',
                minHeight: 0,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
              }
            : {}),
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
            flexShrink: 0,
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
            IMH
          </Typography>
          <Chip
            size="small"
            label={imhNumeroCpChip(value)}
            sx={{
              height: 22,
              fontWeight: 700,
              bgcolor: '#e8f5e9',
              color: EXCEL_SHEET.selectedCheck,
              border: `1px solid ${EXCEL_SHEET.selectedCheck}33`,
            }}
          />
          <Chip
            size="small"
            variant="outlined"
            label={`${linhasFiltradas.length} de ${value.linhas.length} lançamento(s)`}
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
          {somas.valorTotal > 0 || somas.pctIndenizar > 0 ? (
            <>
              <Chip
                size="small"
                variant="outlined"
                label={`VALOR TOTAL ${formatValorBrasileiro(somas.valorTotal)}`}
                sx={{ height: 22, fontWeight: 600 }}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`% A INDENIZAR ${formatValorBrasileiro(somas.pctIndenizar)}`}
                sx={{ height: 22, fontWeight: 600 }}
              />
            </>
          ) : null}

          <PlanilhaDataFiltros
            idPrefix="imh-prev"
            value={dataFiltro}
            onChange={onDataFiltroChange}
            datas={datas}
          />

          {onImportClick ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<UploadFileIcon sx={{ fontSize: 16 }} />}
              onClick={onImportClick}
              disabled={importing}
              sx={{
                ml: 0.5,
                height: 26,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 12,
                borderColor: EXCEL_SHEET.selectedCheck,
                color: EXCEL_SHEET.selectedCheck,
                bgcolor: '#fff',
                '&:hover': {
                  borderColor: EXCEL_SHEET.selectedCheck,
                  bgcolor: '#e8f5e9',
                },
              }}
            >
              {importing ? 'Importando…' : 'Importar planilha'}
            </Button>
          ) : null}
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
          <Box
            sx={{
              ml: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              flexShrink: 0,
            }}
          >
            <PlanilhaExpandButton
              expanded={expanded}
              onToggle={() => setExpanded((v) => !v)}
              labelExpand="Expandir planilha IMH"
              labelCollapse="Recolher planilha IMH"
            />
            {onRequestClear ? (
              <IconButton
                size="small"
                aria-label="Apagar lançamentos IMH"
                onClick={onRequestClear}
                disabled={
                  value.linhas.length === 0 && !value.clinica.trim() && !value.numeroCp.trim()
                }
                sx={{ color: 'error.main' }}
              >
                <TrashIcon fontSize="small" />
              </IconButton>
            ) : null}
          </Box>
        </Box>

        {!visible ? (
          <Box sx={{ px: 2.5, py: 4, textAlign: 'center', opacity: 0.55, flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Preencha o cabeçalho e as linhas — ou importe a aba IMH — para ver a planilha ao vivo.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              p: expanded ? 0 : 1.5,
              borderTop: EXCEL_SHEET.border,
              display: 'flex',
              flexDirection: 'column',
              gap: expanded ? 0 : 1.25,
              width: expanded ? '100%' : 'fit-content',
              maxWidth: '100%',
              minWidth: expanded ? 0 : undefined,
              flex: expanded ? 1 : undefined,
              minHeight: 0,
              overflow: expanded ? 'hidden' : undefined,
              boxSizing: 'border-box',
            }}
          >
            {value.clinica.trim() && !expanded ? (
              <Box
                sx={{
                  display: 'grid',
                  gap: 0.35,
                  px: 0.25,
                  minWidth: 0,
                  flexShrink: 0,
                }}
              >
                <Typography sx={{ ...titleTextSx, fontWeight: 700, textAlign: 'center' }}>
                  {value.clinica.trim()}
                </Typography>
              </Box>
            ) : null}

            <PlanilhaFitWidth
              enabled={expanded}
              cellFontSize="10px"
              remountKey={`${colCount}-${linhasFiltradas.length}-${selectionEnabled ? 1 : 0}`}
            >
            <Box
              className="excel-sheet-grid"
              sx={{
                width: expanded ? '100%' : 'fit-content',
                maxWidth: '100%',
                minWidth: expanded ? 0 : undefined,
                overflowX: expanded ? 'hidden' : 'auto',
                border: EXCEL_SHEET.border,
                borderRadius: expanded ? 0 : 1,
                bgcolor: EXCEL_SHEET.sheetBg,
                boxSizing: 'border-box',
              }}
            >
              <Table
                size="small"
                sx={{
                  width: expanded ? '100%' : 'auto',
                  maxWidth: expanded ? '100%' : undefined,
                  minWidth: expanded ? 0 : undefined,
                  tableLayout: expanded ? 'fixed' : 'auto',
                  ...(expanded
                    ? {
                        '& .MuiTableCell-root': {
                          boxSizing: 'border-box',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                          minWidth: 0,
                          px: 0.5,
                          py: 0.5,
                        },
                      }
                    : {}),
                }}
              >
                <TableHead>
                  <TableRow>
                    {selectionEnabled ? (
                      <TableCell
                        sx={{
                          ...headerSx,
                          bgcolor: EXCEL_SHEET.selectHeaderBg,
                          width: expanded ? selectionWidth : undefined,
                          minWidth: expanded ? 0 : 52,
                          textAlign: 'center',
                          px: 0.5,
                          whiteSpace: expanded ? 'normal' : 'nowrap',
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
                            IMH
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
                    {IMH_ABA_COLUNAS.map((col) => {
                      const colWidth = expanded
                        ? resolveColWidth(col.key, col.width)
                        : undefined
                      return (
                        <TableCell
                          key={col.key}
                          sx={{
                            ...headerSx,
                            width: colWidth,
                            minWidth: expanded ? 0 : col.width,
                            whiteSpace: expanded ? 'normal' : 'nowrap',
                            lineHeight: expanded ? 1.2 : undefined,
                            fontSize: cellFontSize,
                            fontWeight: EXCEL_SHEET.fontWeightBold,
                            ...(expanded ? { transition: 'width 160ms ease' } : null),
                          }}
                        >
                          {col.label}
                        </TableCell>
                      )
                    })}
                    {actionsEnabled ? (
                      <TableCell
                        sx={{
                          ...headerSx,
                          textAlign: 'center',
                          width: expanded ? actionsWidth : 72,
                          minWidth: expanded ? 0 : 72,
                          whiteSpace: expanded ? 'normal' : 'nowrap',
                          fontSize: cellFontSize,
                        }}
                      >
                        AÇÕES
                      </TableCell>
                    ) : null}
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
                    const finalizado = finalizedIds.has(linha.id)
                    const devolvido = !finalizado && devolvidosIds.has(linha.id)
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
                              className={
                                finalizado
                                  ? 'excel-checkbox-finalizado'
                                  : devolvido
                                    ? 'excel-checkbox-devolvido'
                                    : undefined
                              }
                              checked={checked}
                              disabled={finalizado}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(_, nextChecked) => toggleOne(linha.id, nextChecked)}
                              sx={{
                                p: 0,
                                ...(finalizado
                                  ? finalizedCheckboxSx
                                  : devolvido
                                    ? devolvidoCheckboxSx
                                    : selectedCheckboxSx),
                              }}
                            />
                          </TableCell>
                        ) : null}
                        {IMH_ABA_COLUNAS.map((col) => {
                          const colWidth = expanded
                            ? resolveColWidth(col.key, col.width)
                            : undefined
                          const text = dash(String(linha[col.key] ?? ''))
                          const hovered = isColHovered(col.key)
                          return (
                            <TableCell
                              key={col.key}
                              {...colHoverHandlers(col.key)}
                              sx={{
                                ...cellSx,
                                width: colWidth,
                                fontSize: cellFontSize,
                                fontWeight: cellFontWeight,
                                textAlign: 'center',
                                verticalAlign: expanded ? 'top' : 'middle',
                                ...(expanded
                                  ? {
                                      whiteSpace: 'normal',
                                      wordBreak: 'break-word',
                                      overflowWrap: 'anywhere',
                                      minWidth: 0,
                                      transition: 'width 160ms ease',
                                      cursor: 'default',
                                    }
                                  : col.key === 'descricao' || col.key === 'nomeUsuario'
                                    ? {
                                        whiteSpace: 'pre-wrap',
                                        maxWidth: col.width + 40,
                                        minWidth: 120,
                                      }
                                    : null),
                              }}
                            >
                              {expanded ? (
                                <PlanilhaExpandedCellContent showFull={hovered}>
                                  {text}
                                </PlanilhaExpandedCellContent>
                              ) : (
                                text
                              )}
                            </TableCell>
                          )
                        })}
                        {actionsEnabled ? (
                          <TableCell
                            sx={{
                              ...cellSx,
                              textAlign: 'center',
                              width: expanded ? actionsWidth : undefined,
                              minWidth: expanded ? 0 : 72,
                              fontSize: cellFontSize,
                              fontWeight: cellFontWeight,
                            }}
                          >
                            <IconButton
                              size="small"
                              aria-label={`Editar linha IMH ${index + 1}`}
                              onClick={() => onEditLinha?.(linha.id)}
                              sx={{ p: 0.35 }}
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              aria-label={`Excluir linha IMH ${index + 1}`}
                              onClick={() => onDeleteLinha?.(linha.id)}
                              sx={{ p: 0.35 }}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    )
                  })
                  )}
                </TableBody>
              </Table>
            </Box>
            </PlanilhaFitWidth>
          </Box>
        )}
      </Paper>
  )

  return (
    <Box
      sx={{
        opacity: visible ? 1 : 0.92,
        transform: expanded ? 'none' : visible ? 'translateY(0)' : 'translateY(4px)',
        transition: expanded ? undefined : 'opacity 280ms ease, transform 280ms ease',
      }}
    >
      {expanded ? (
        <PlanilhaFullscreenDialog open onClose={() => setExpanded(false)}>
          {sheet}
        </PlanilhaFullscreenDialog>
      ) : (
        sheet
      )}

      <GerarDocumentoModal
        open={gerarOpen}
        disabled={linhasFiltradas.length === 0}
        onClose={() => setGerarOpen(false)}
        onConfirm={async (formato) => {
          const cp = value.numeroCp.trim()
          const clinica = value.clinica.trim()
          const tituloParts = [
            'IMH',
            clinica || null,
            cp ? `CP ${cp}` : null,
            IMH_ABA_HOSPITAL,
          ].filter(Boolean)
          await downloadGerarDocumento(
            {
              titulo: tituloParts.join(' — '),
              fileBaseName: 'IMH',
              headers: IMH_ABA_COLUNAS.map((c) => c.label),
              columnWidths: IMH_ABA_COLUNAS.map((c) => c.width),
              rows: linhasFiltradas.map((linha) =>
                IMH_ABA_COLUNAS.map((c) => String(linha[c.key] ?? '').trim()),
              ),
            },
            formato,
          )
        }}
      />
    </Box>
  )
}
