import {
  DeleteOutlined as DeleteIcon,
  DeleteOutlined as TrashIcon,
  DescriptionOutlined as GerarDocIcon,
  EditOutlined as EditIcon,
  UploadFileOutlined as UploadFileIcon,
} from '@mui/icons-material'
import {
  PlanilhaBoldToggle,
  usePlanilhaBoldPreference,
} from '@/components/clinica/PlanilhaBoldToggle'
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
import { useEffect, useMemo, useRef, useState } from 'react'
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
  PlanilhaActionsButtons,
  PlanilhaExpandedCellContent,
  planilhaActionsCellSx,
  usePlanilhaColunaHover,
} from '@/components/clinica/planilhaColunaHover'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import {
  IMH_ABA_COLUNAS,
  IMH_ABA_HOSPITAL,
  buildImhPctIndenizarNipSpans,
  buildImhValorTotalNipSpans,
  calcImhSomasValorEIndenizar,
  imhFormHasPreviewContent,
  imhNumeroCpChip,
  normalizeImhNipKey,
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
  /** Notifica o pai quando a planilha entra/sai do modo expandido. */
  onExpandedChange?: (expanded: boolean) => void
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

/** Viewport: no máximo 12 linhas de dados + cabeçalho (igual Div. Material). */
const IMH_VISIBLE_BODY_ROWS = 12
const IMH_HEADER_HEIGHT_PX = 44
const IMH_ROW_HEIGHT_PX = 40
const IMH_GRID_PAD_PX = 24
const IMH_VIEWPORT_MAX_HEIGHT_PX =
  IMH_HEADER_HEIGHT_PX + IMH_VISIBLE_BODY_ROWS * IMH_ROW_HEIGHT_PX + IMH_GRID_PAD_PX
/** DESCRIÇÃO DO PROCEDIMENTO/MEDICAMENTO: largura mínima (~50 caracteres). */
const IMH_DESCRICAO_MIN_CHARS = 50

const headerSx = {
  ...cellSx,
  bgcolor: EXCEL_SHEET.headerBg,
  fontWeight: EXCEL_SHEET.fontWeightBold,
  color: EXCEL_SHEET.mutedText,
  position: 'sticky' as const,
  top: 0,
  zIndex: 4,
  backgroundClip: 'padding-box',
  boxShadow: `inset 0 -1px 0 ${EXCEL_SHEET.borderColor}`,
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
  onExpandedChange,
}: ImhAbaPlanilhaPreviewProps) {
  const [gerarOpen, setGerarOpen] = useState(false)
  const { boldEnabled, toggleBold } = usePlanilhaBoldPreference()
  const { expanded, setExpanded } = usePlanilhaExpand()
  const tableRef = useRef<HTMLTableElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const visible = imhFormHasPreviewContent(value)

  useEffect(() => {
    onExpandedChange?.(expanded)
  }, [expanded, onExpandedChange])

  const selectionEnabled = Boolean(onSelectedImhIdsChange)
  /** Editar só na planilha expandida; excluir permanece nos dois modos. */
  const editEnabled = Boolean(expanded && onEditLinha)
  const deleteEnabled = Boolean(onDeleteLinha)
  const actionsEnabled = editEnabled || deleteEnabled
  const isEditingMode = Boolean(editingLinhaId)
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
  const editingNipKey = useMemo(() => {
    if (!editingLinhaId) return ''
    const ativa =
      linhasFiltradas.find((l) => l.id === editingLinhaId) ??
      value.linhas.find((l) => l.id === editingLinhaId)
    return ativa ? normalizeImhNipKey(ativa.nip) : ''
  }, [editingLinhaId, linhasFiltradas, value.linhas])

  /** Em edição: o grupo do NIP sobe para o topo (ordem só visual). */
  const linhasExibidas = useMemo(() => {
    if (!editingLinhaId) return linhasFiltradas
    const ativa = linhasFiltradas.find((l) => l.id === editingLinhaId)
    if (!ativa) return linhasFiltradas
    if (!editingNipKey) {
      return [ativa, ...linhasFiltradas.filter((l) => l.id !== editingLinhaId)]
    }
    const grupo = linhasFiltradas.filter(
      (l) => normalizeImhNipKey(l.nip) === editingNipKey,
    )
    const resto = linhasFiltradas.filter(
      (l) => normalizeImhNipKey(l.nip) !== editingNipKey,
    )
    return [...grupo, ...resto]
  }, [linhasFiltradas, editingLinhaId, editingNipKey])

  useEffect(() => {
    if (!expanded || !editingLinhaId) return
    const scrollRoot = scrollContainerRef.current
    if (!scrollRoot) return
    const run = () => {
      scrollRoot.scrollTo({ top: 0, behavior: 'smooth' })
      const row = scrollRoot.querySelector(
        `[data-planilha-linha-id="${editingLinhaId}"]`,
      ) as HTMLElement | null
      row?.scrollIntoView({ block: 'start', behavior: 'smooth', inline: 'nearest' })
    }
    requestAnimationFrame(() => requestAnimationFrame(run))
    const t = window.setTimeout(run, 80)
    return () => window.clearTimeout(t)
  }, [expanded, editingLinhaId, linhasExibidas])

  const valorTotalNipSpans = useMemo(
    () => buildImhValorTotalNipSpans(linhasExibidas),
    [linhasExibidas],
  )
  const pctIndenizarNipSpans = useMemo(
    () => buildImhPctIndenizarNipSpans(linhasExibidas),
    [linhasExibidas],
  )
  const cellTextsByKey = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const col of IMH_ABA_COLUNAS) {
      if (col.key === 'valorTotal') {
        map[col.key] = valorTotalNipSpans.map((span) =>
          span.show ? span.text : '',
        )
        continue
      }
      if (col.key === 'pctIndenizar') {
        map[col.key] = pctIndenizarNipSpans.map((span) =>
          span.show ? span.text : '',
        )
        continue
      }
      map[col.key] = linhasExibidas.map((linha) => dash(String(linha[col.key] ?? '')))
    }
    return map
  }, [linhasExibidas, valorTotalNipSpans, pctIndenizarNipSpans])
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
  const cellFontWeight =
    expanded && boldEnabled ? EXCEL_SHEET.fontWeightBold : EXCEL_SHEET.fontWeight
  const dimmedSx = {
    opacity: 0.28,
    transition: 'opacity 160ms ease',
    pointerEvents: 'none' as const,
  }
  const {
    resolveColWidth,
    resolveColMinWidth,
    isColHovered,
    colHoverHandlers,
    selectionWidth,
    actionsWidth,
  } = usePlanilhaColunaHover(IMH_ABA_COLUNAS, {
    selectionEnabled,
    actionsEnabled,
    descricaoKey: 'descricao',
    minCharsByKey: { descricao: IMH_DESCRICAO_MIN_CHARS },
    cellTextsByKey,
    tableRef,
    fontSizePx: expanded ? 10 : 11,
    fontWeight: cellFontWeight,
  })

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
    const clicked = selecionaveis.find((l) => l.id === linhaId)
    if (!clicked) return
    const nipKey = normalizeImhNipKey(clicked.nip)
    /** Mesmo NIP (grupo do VALOR TOTAL mesclado): marca/desmarca todos juntos. */
    const grupo = nipKey
      ? selecionaveis.filter((l) => normalizeImhNipKey(l.nip) === nipKey)
      : [clicked]
    const next = new Set(selection)
    for (const linha of grupo) {
      if (checked) next.add(linha.id)
      else next.delete(linha.id)
    }
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
            ...(isEditingMode ? dimmedSx : { transition: 'opacity 160ms ease' }),
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

          {expanded ? (
            <PlanilhaBoldToggle enabled={boldEnabled} onToggle={toggleBold} />
          ) : null}

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
            className="excel-sheet-grid"
            sx={{
              p: expanded ? 0 : 1.5,
              borderTop: EXCEL_SHEET.border,
              display: 'flex',
              flexDirection: 'column',
              gap: expanded ? 0 : 1.25,
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              // Máx. 12 linhas visíveis; em tela cheia usa toda a página.
              maxHeight: expanded ? 'none' : IMH_VIEWPORT_MAX_HEIGHT_PX,
              flex: expanded ? 1 : undefined,
              minHeight: 0,
              // Rolagem só no PlanilhaFitWidth (âncora do sticky header).
              overflow: 'hidden',
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
              enabled
              fillHeight
              cellFontSize={cellFontSize}
              cellFontWeight={cellFontWeight}
              nowrapBody
              scrollRef={scrollContainerRef}
              bottomPad={expanded && editingLinhaId ? '70vh' : undefined}
              remountKey={`${colCount}-${linhasFiltradas.length}-${selectionEnabled ? 1 : 0}`}
            >
            <Box
              sx={{
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                border: EXCEL_SHEET.border,
                borderRadius: expanded ? 0 : 1,
                bgcolor: EXCEL_SHEET.sheetBg,
                boxSizing: 'border-box',
              }}
            >
              <Table
                ref={tableRef}
                size="small"
                stickyHeader
                sx={{
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0,
                  tableLayout: 'fixed',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  '& .MuiTableCell-root': {
                    boxSizing: 'border-box',
                    minWidth: 0,
                    px: 0.5,
                    py: 0.5,
                    fontSize: cellFontSize,
                    fontWeight: cellFontWeight,
                  },
                  '& thead .MuiTableCell-root': {
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    position: 'sticky',
                    top: 0,
                    zIndex: 4,
                  },
                  '& tbody .MuiTableCell-root:not(.excel-planilha-actions-col)': {
                    whiteSpace: 'nowrap',
                    wordBreak: 'normal',
                    overflowWrap: 'normal',
                    textOverflow: 'ellipsis',
                  },
                }}
              >
                <TableHead sx={isEditingMode ? dimmedSx : undefined}>
                  <TableRow>
                    {selectionEnabled ? (
                      <TableCell
                        sx={{
                          ...headerSx,
                          bgcolor: EXCEL_SHEET.selectHeaderBg,
                          width: selectionWidth,
                          minWidth: 0,
                          textAlign: 'center',
                          px: 0.5,
                          whiteSpace: 'normal',
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
                      const colWidth = resolveColWidth(col.key)
                      const colMinWidth = resolveColMinWidth(col.key)
                      return (
                        <TableCell
                          key={col.key}
                          data-col-key={col.key}
                          sx={{
                            ...headerSx,
                            width: colWidth,
                            minWidth: colMinWidth || 0,
                            whiteSpace: 'normal',
                            lineHeight: 1.2,
                            fontSize: cellFontSize,
                            fontWeight: EXCEL_SHEET.fontWeightBold,
                            transition: 'width 160ms ease',
                          }}
                        >
                          {col.label}
                        </TableCell>
                      )
                    })}
                    {actionsEnabled ? (
                      <TableCell
                        className="excel-planilha-actions-col"
                        sx={{
                          ...headerSx,
                          ...planilhaActionsCellSx,
                          width: actionsWidth,
                          fontSize: cellFontSize,
                        }}
                      >
                        AÇÕES
                      </TableCell>
                    ) : null}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {linhasExibidas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={colCount} sx={{ ...cellSx, color: EXCEL_SHEET.mutedText }}>
                        Nenhum registro no período filtrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    linhasExibidas.map((linha, index) => {
                    const editing =
                      editingLinhaId === linha.id ||
                      (Boolean(editingNipKey) &&
                        normalizeImhNipKey(linha.nip) === editingNipKey)
                    const finalizado = finalizedIds.has(linha.id)
                    const devolvido = !finalizado && devolvidosIds.has(linha.id)
                    const checked = finalizado || selection.has(linha.id)
                    const actionsSpan = valorTotalNipSpans[index]
                    /** Primeira linha do bloco NIP (onde ficam as células mescladas). */
                    const editingGroupLeader = Boolean(editing && actionsSpan?.show)
                    const editingGroupSize = editingGroupLeader
                      ? Math.max(1, actionsSpan?.rowSpan ?? 1)
                      : 1
                    const editingGroupMulti = editingGroupLeader && editingGroupSize > 1
                    return (
                      <TableRow
                        key={linha.id}
                        data-planilha-linha-id={linha.id}
                        sx={{
                          bgcolor: editing
                            ? EXCEL_SHEET.editingBg
                            : selection.has(linha.id)
                              ? EXCEL_SHEET.selectedBg
                              : undefined,
                          // Só o líder cria stacking — isolation/outline por linha quebrava o rowSpan.
                          position: editingGroupLeader ? 'relative' : undefined,
                          zIndex: editingGroupLeader ? 5 : editing ? 4 : undefined,
                          outline:
                            editingGroupLeader && !editingGroupMulti
                              ? `2px solid ${EXCEL_SHEET.selectedCheck}`
                              : undefined,
                          outlineOffset:
                            editingGroupLeader && !editingGroupMulti ? -2 : undefined,
                          boxShadow:
                            editingGroupLeader && !editingGroupMulti
                              ? `0 0 0 1px ${EXCEL_SHEET.selectedCheck}, 0 4px 16px rgba(15,23,42,0.18)`
                              : undefined,
                          opacity: editing ? 1 : isEditingMode ? 0.22 : 1,
                          filter: editing ? 'none' : isEditingMode ? 'saturate(0.35)' : undefined,
                          transition: 'opacity 160ms ease, filter 160ms ease',
                          pointerEvents: isEditingMode && !editing ? 'none' : undefined,
                          '& > .MuiTableCell-root': editing
                            ? {
                                bgcolor: `${EXCEL_SHEET.editingBg} !important`,
                                opacity: '1 !important',
                              }
                            : undefined,
                          '&:hover > .MuiTableCell-root': {
                            bgcolor: editing ? EXCEL_SHEET.editingBg : EXCEL_SHEET.hoverBg,
                          },
                          // Moldura única cobrindo o grupo mesclado (VALOR TOTAL / % / AÇÕES).
                          ...(editingGroupMulti
                            ? {
                                '&::after': {
                                  content: '""',
                                  pointerEvents: 'none',
                                  position: 'absolute',
                                  left: 0,
                                  right: 0,
                                  top: 0,
                                  bottom: `calc(-100% * ${editingGroupSize - 1})`,
                                  border: `2px solid ${EXCEL_SHEET.selectedCheck}`,
                                  borderRadius: '2px',
                                  boxShadow: `0 4px 16px rgba(15,23,42,0.18)`,
                                  zIndex: 7,
                                },
                              }
                            : null),
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
                          const colWidth = resolveColWidth(col.key)
                          const colMinWidth = resolveColMinWidth(col.key)
                          const hovered = isColHovered(col.key)
                          const nipSpan =
                            col.key === 'valorTotal'
                              ? valorTotalNipSpans[index]
                              : col.key === 'pctIndenizar'
                                ? pctIndenizarNipSpans[index]
                                : null
                          if (nipSpan) {
                            if (!nipSpan.show) return null
                            return (
                              <TableCell
                                key={col.key}
                                data-col-key={col.key}
                                rowSpan={nipSpan.rowSpan > 1 ? nipSpan.rowSpan : undefined}
                                {...colHoverHandlers(col.key)}
                                sx={{
                                  ...cellSx,
                                  width: colWidth,
                                  fontSize: cellFontSize,
                                  fontWeight:
                                    nipSpan.rowSpan > 1
                                      ? EXCEL_SHEET.fontWeightBold
                                      : cellFontWeight,
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                  minWidth: colMinWidth || (hovered ? colWidth : 0),
                                  transition: 'width 160ms ease',
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  whiteSpace: 'nowrap',
                                  wordBreak: 'normal',
                                  overflowWrap: 'normal',
                                  textOverflow: hovered ? 'clip' : 'ellipsis',
                                  overflow: 'hidden',
                                }}
                              >
                                <PlanilhaExpandedCellContent showFull={hovered}>
                                  {nipSpan.text}
                                </PlanilhaExpandedCellContent>
                              </TableCell>
                            )
                          }
                          const text = dash(String(linha[col.key] ?? ''))
                          return (
                            <TableCell
                              key={col.key}
                              data-col-key={col.key}
                              {...colHoverHandlers(col.key)}
                              sx={{
                                ...cellSx,
                                width: colWidth,
                                fontSize: cellFontSize,
                                fontWeight: cellFontWeight,
                                textAlign: 'center',
                                verticalAlign: 'middle',
                                minWidth: colMinWidth || (hovered ? colWidth : 0),
                                transition: 'width 160ms ease',
                                cursor: 'pointer',
                                userSelect: 'none',
                                whiteSpace: 'nowrap',
                                wordBreak: 'normal',
                                overflowWrap: 'normal',
                                textOverflow: hovered ? 'clip' : 'ellipsis',
                                overflow: 'hidden',
                              }}
                            >
                              <PlanilhaExpandedCellContent showFull={hovered}>
                                {text}
                              </PlanilhaExpandedCellContent>
                            </TableCell>
                          )
                        })}
                        {actionsEnabled ? (
                          !actionsSpan?.show ? null : (
                            <TableCell
                              className="excel-planilha-actions-col"
                              rowSpan={
                                actionsSpan.rowSpan > 1 ? actionsSpan.rowSpan : undefined
                              }
                              sx={{
                                ...cellSx,
                                ...planilhaActionsCellSx,
                                width: actionsWidth,
                                fontSize: cellFontSize,
                                fontWeight: cellFontWeight,
                                verticalAlign: 'middle',
                              }}
                            >
                              <PlanilhaActionsButtons>
                                {editEnabled ? (
                                  <IconButton
                                    size="small"
                                    aria-label={
                                      actionsSpan.rowSpan > 1
                                        ? `Editar ${actionsSpan.rowSpan} lançamentos do NIP`
                                        : `Editar linha IMH ${index + 1}`
                                    }
                                    onClick={() => onEditLinha?.(linha.id)}
                                    sx={{ p: 0.25 }}
                                  >
                                    <EditIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                ) : null}
                                {deleteEnabled ? (
                                  <IconButton
                                    size="small"
                                    color="error"
                                    aria-label={
                                      actionsSpan.rowSpan > 1
                                        ? `Excluir ${actionsSpan.rowSpan} lançamentos do NIP`
                                        : `Excluir linha IMH ${index + 1}`
                                    }
                                    onClick={() => onDeleteLinha?.(linha.id)}
                                    sx={{ p: 0.25 }}
                                  >
                                    <DeleteIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                ) : null}
                              </PlanilhaActionsButtons>
                            </TableCell>
                          )
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
