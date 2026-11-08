import { useMemo, useState } from 'react'
import {
  Add as AddIcon,
  DeleteOutlined as DeleteIcon,
  DescriptionOutlined as GerarDocIcon,
  EditOutlined as EditIcon,
  HistoryOutlined as HistoricoIcon,
  SwapVert as MovimentarIcon,
  UploadFileOutlined as UploadFileIcon,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import type { ListaMedicamentosFormData, ListaMedicamentosLinha } from '@/types'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import { GerarDocumentoModal } from '@/components/clinica/GerarDocumentoModal'
import { ListaMedicamentoHistoricoMovimentacoesModal } from '@/components/clinica/ListaMedicamentoHistoricoMovimentacoesModal'
import {
  LISTA_MEDICAMENTOS_COLUNAS,
  countListaMedEstoque,
  countListaMedValidade,
  filterListaMedicamentosByToolbarFiltro,
  getListaMedEstoqueStatus,
  getListaMedValidadeStatus,
  listaMedicamentosHasPreviewContent,
  type ListaMedToolbarFiltro,
} from '@/utils/listaMedicamentosForm'
import { downloadGerarDocumento } from '@/utils/gerarDocumentoTabela'
import '@/components/clinica/spreadsheet-excel.css'

interface ListaMedicamentosPlanilhaPreviewProps {
  value: ListaMedicamentosFormData
  editingLinhaId?: string | null
  importing?: boolean
  onImportClick?: () => void
  /** Abre o modal de cadastro/entrada de medicamento. */
  onEntradaClick?: () => void
  onExplicacaoClick?: () => void
  onEditLinha?: (linhaId: string) => void
  onDeleteLinha?: (linhaId: string) => void
  onMovimentarLinha?: (linhaId: string) => void
}

const toolbarBtnSx = {
  height: 30,
  textTransform: 'none' as const,
  fontWeight: 700,
  fontSize: 12,
  px: 1.25,
  borderRadius: 1.5,
  whiteSpace: 'nowrap' as const,
}

function dash(value: string): string {
  const trimmed = value.trim()
  return trimmed || '—'
}

const CHIP_ORANGE_BG = '#fff3e0'
const CHIP_RED_BG = '#ffebee'
const CHIP_VENCIDO_BG = '#fce4ec'
const CHIP_PROXIMO_BG = '#fff8e1'
const BORDER_ALERT_ORANGE = '#fb8c00'
const BORDER_ALERT_RED = '#e53935'

const alertCellBorderSx = (color: string) =>
  ({
    boxShadow: `inset 0 0 0 2px ${color}`,
    borderColor: color,
  }) as const

const filtroGroupSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.75,
  flexWrap: 'wrap' as const,
  px: 1,
  py: 0.5,
  borderRadius: 1.5,
  border: `1px solid ${EXCEL_SHEET.toolbarBorder}`,
  bgcolor: '#fff',
} as const

const cellSx = {
  border: EXCEL_SHEET.border,
  fontFamily: EXCEL_SHEET.fontFamily,
  fontSize: EXCEL_SHEET.fontSize,
  fontWeight: EXCEL_SHEET.fontWeight,
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

export function ListaMedicamentosPlanilhaPreview({
  value,
  editingLinhaId = null,
  importing = false,
  onImportClick,
  onEntradaClick,
  onExplicacaoClick,
  onEditLinha,
  onDeleteLinha,
  onMovimentarLinha,
}: ListaMedicamentosPlanilhaPreviewProps) {
  const [filtro, setFiltro] = useState<ListaMedToolbarFiltro>({ tipo: 'todos' })
  const [gerarOpen, setGerarOpen] = useState(false)
  const [historicoOpen, setHistoricoOpen] = useState(false)
  const [historicoSeed, setHistoricoSeed] = useState<ListaMedicamentosLinha | null>(null)
  const visible = listaMedicamentosHasPreviewContent(value)
  const contagemEstoque = useMemo(() => countListaMedEstoque(value), [value])
  const contagemValidade = useMemo(() => countListaMedValidade(value), [value])
  const linhasVisiveis = useMemo(
    () => filterListaMedicamentosByToolbarFiltro(value, filtro),
    [value, filtro],
  )
  const colCount = LISTA_MEDICAMENTOS_COLUNAS.length + 1

  const toggleEstoqueFiltro = (valueFiltro: 'baixo' | 'zerado') => {
    setFiltro((prev) =>
      prev.tipo === 'estoque' && prev.value === valueFiltro
        ? { tipo: 'todos' }
        : { tipo: 'estoque', value: valueFiltro },
    )
  }

  const toggleValidadeFiltro = (valueFiltro: 'vencido' | 'proximo') => {
    setFiltro((prev) =>
      prev.tipo === 'validade' && prev.value === valueFiltro
        ? { tipo: 'todos' }
        : { tipo: 'validade', value: valueFiltro },
    )
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
            px: { xs: 1.25, sm: 1.75 },
            py: 1.25,
            bgcolor: EXCEL_SHEET.toolbarBg,
            borderBottom: `1px solid ${EXCEL_SHEET.toolbarBorder}`,
            display: 'grid',
            gap: 1.25,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' },
              justifyContent: 'space-between',
              gap: 1.25,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: EXCEL_SHEET.fontFamily,
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: '-0.02em',
                  color: EXCEL_SHEET.text,
                  lineHeight: 1.2,
                }}
              >
                Lista de Medicamentos
              </Typography>
              <Typography
                sx={{
                  mt: 0.25,
                  fontSize: 11.5,
                  color: EXCEL_SHEET.mutedText,
                  lineHeight: 1.35,
                }}
              >
                Estoque por lote, alertas de validade e preço de referência
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={`${value.linhas.length} item(ns)`}
                  sx={{
                    height: 22,
                    fontWeight: 700,
                    fontSize: 11,
                    bgcolor: '#fff',
                    border: `1px solid ${EXCEL_SHEET.toolbarBorder}`,
                  }}
                />
                {filtro.tipo !== 'todos' ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label="Limpar filtros"
                    onClick={() => setFiltro({ tipo: 'todos' })}
                    onDelete={() => setFiltro({ tipo: 'todos' })}
                    sx={{ height: 22, fontWeight: 600, fontSize: 11 }}
                  />
                ) : null}
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: { xs: 'flex-start', md: 'flex-end' },
                gap: 0.75,
              }}
            >
              {onEntradaClick ? (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                  onClick={onEntradaClick}
                  sx={toolbarBtnSx}
                >
                  Entrada de Medicamento
                </Button>
              ) : null}
              {onImportClick ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<UploadFileIcon sx={{ fontSize: 16 }} />}
                  onClick={onImportClick}
                  disabled={importing}
                  sx={{
                    ...toolbarBtnSx,
                    borderColor: EXCEL_SHEET.selectedCheck,
                    color: EXCEL_SHEET.selectedCheck,
                    bgcolor: '#fff',
                    '&:hover': {
                      borderColor: EXCEL_SHEET.selectedCheck,
                      bgcolor: '#e8f5e9',
                    },
                  }}
                >
                  {importing ? 'Importando…' : 'Importar'}
                </Button>
              ) : null}
              <Button
                size="small"
                variant="outlined"
                startIcon={<HistoricoIcon sx={{ fontSize: 16 }} />}
                onClick={() => {
                  setHistoricoSeed(null)
                  setHistoricoOpen(true)
                }}
                sx={{
                  ...toolbarBtnSx,
                  color: '#0f5c8c',
                  borderColor: '#0f5c8c',
                  bgcolor: '#fff',
                }}
              >
                Histórico
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<GerarDocIcon sx={{ fontSize: 16 }} />}
                onClick={() => setGerarOpen(true)}
                disabled={!visible || value.linhas.length === 0}
                sx={{ ...toolbarBtnSx, bgcolor: '#fff' }}
              >
                Gerar Documento
              </Button>
              {onExplicacaoClick ? (
                <Button
                  size="small"
                  variant="text"
                  onClick={onExplicacaoClick}
                  sx={{ ...toolbarBtnSx, color: EXCEL_SHEET.mutedText }}
                >
                  Ajuda
                </Button>
              ) : null}
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1,
              pt: 0.25,
              borderTop: `1px solid ${EXCEL_SHEET.toolbarBorder}`,
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 800,
                color: EXCEL_SHEET.mutedText,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
                mr: 0.25,
              }}
            >
              Filtros
            </Typography>
            <Box sx={filtroGroupSx}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: EXCEL_SHEET.mutedText,
                  whiteSpace: 'nowrap',
                }}
              >
                Estoque
              </Typography>
              <Chip
                size="small"
                clickable
                label={`${contagemEstoque.baixo} baixo`}
                onClick={() => toggleEstoqueFiltro('baixo')}
                sx={{
                  height: 22,
                  fontWeight: 700,
                  bgcolor:
                    filtro.tipo === 'estoque' && filtro.value === 'baixo'
                      ? BORDER_ALERT_ORANGE
                      : CHIP_ORANGE_BG,
                  color:
                    filtro.tipo === 'estoque' && filtro.value === 'baixo' ? '#fff' : '#e65100',
                  border: '1px solid #ffb74d',
                }}
              />
              <Chip
                size="small"
                clickable
                label={`${contagemEstoque.zerado} zerado`}
                onClick={() => toggleEstoqueFiltro('zerado')}
                sx={{
                  height: 22,
                  fontWeight: 700,
                  bgcolor:
                    filtro.tipo === 'estoque' && filtro.value === 'zerado'
                      ? BORDER_ALERT_RED
                      : CHIP_RED_BG,
                  color:
                    filtro.tipo === 'estoque' && filtro.value === 'zerado' ? '#fff' : '#c62828',
                  border: '1px solid #ef9a9a',
                }}
              />
            </Box>
            <Box sx={filtroGroupSx}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: EXCEL_SHEET.mutedText,
                  whiteSpace: 'nowrap',
                }}
              >
                Validade
              </Typography>
              <Chip
                size="small"
                clickable
                label={`${contagemValidade.vencido} vencido`}
                onClick={() => toggleValidadeFiltro('vencido')}
                sx={{
                  height: 22,
                  fontWeight: 700,
                  bgcolor:
                    filtro.tipo === 'validade' && filtro.value === 'vencido'
                      ? '#c2185b'
                      : CHIP_VENCIDO_BG,
                  color:
                    filtro.tipo === 'validade' && filtro.value === 'vencido' ? '#fff' : '#ad1457',
                  border: '1px solid #f48fb1',
                }}
              />
              <Chip
                size="small"
                clickable
                label={`${contagemValidade.proximo} próximo`}
                onClick={() => toggleValidadeFiltro('proximo')}
                sx={{
                  height: 22,
                  fontWeight: 700,
                  bgcolor:
                    filtro.tipo === 'validade' && filtro.value === 'proximo'
                      ? BORDER_ALERT_ORANGE
                      : CHIP_PROXIMO_BG,
                  color:
                    filtro.tipo === 'validade' && filtro.value === 'proximo' ? '#fff' : '#f57f17',
                  border: '1px solid #ffe082',
                }}
              />
            </Box>
          </Box>
        </Box>

        {!visible ? (
          <Box sx={{ px: 2.5, py: 4, textAlign: 'center', opacity: 0.55 }}>
            <Typography variant="body2" color="text.secondary">
              Adicione medicamentos — ou importe a planilha de preços — para ver a lista ao vivo.
            </Typography>
          </Box>
        ) : (
          <Box
            className="excel-sheet-grid"
            sx={{
              p: 1.5,
              borderTop: EXCEL_SHEET.border,
              width: 'fit-content',
              maxWidth: '100%',
              overflowX: 'auto',
              maxHeight: 'min(70vh, 720px)',
              overflowY: 'auto',
            }}
          >
            <Box
              sx={{
                width: 'fit-content',
                maxWidth: '100%',
                border: EXCEL_SHEET.border,
                borderRadius: 1,
                bgcolor: EXCEL_SHEET.sheetBg,
              }}
            >
              <Table size="small" stickyHeader sx={{ width: 'auto', tableLayout: 'auto' }}>
                <TableHead>
                  <TableRow>
                    {LISTA_MEDICAMENTOS_COLUNAS.map((col) => (
                      <TableCell
                        key={col.key}
                        sx={{
                          ...headerSx,
                          minWidth: col.width,
                          position: 'sticky',
                          top: 0,
                          zIndex: 2,
                        }}
                      >
                        {col.label}
                      </TableCell>
                    ))}
                    <TableCell
                      sx={{
                        ...headerSx,
                        textAlign: 'center',
                        minWidth: 132,
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                      }}
                    >
                      AÇÕES
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {linhasVisiveis.map((linha, index) => {
                    const editing = editingLinhaId === linha.id
                    const statusEstoque = getListaMedEstoqueStatus(linha)
                    const statusValidade = getListaMedValidadeStatus(linha)
                    const rowBg = editing ? EXCEL_SHEET.selectedBg : undefined
                    const qtdBorder =
                      statusEstoque === 'zerado'
                        ? alertCellBorderSx(BORDER_ALERT_RED)
                        : statusEstoque === 'baixo'
                          ? alertCellBorderSx(BORDER_ALERT_ORANGE)
                          : null
                    const validadeBorder =
                      statusValidade === 'vencido'
                        ? alertCellBorderSx(BORDER_ALERT_RED)
                        : statusValidade === 'proximo'
                          ? alertCellBorderSx(BORDER_ALERT_ORANGE)
                          : null
                    return (
                      <TableRow
                        key={linha.id}
                        sx={{
                          bgcolor: rowBg,
                          '& td': { bgcolor: rowBg },
                          '&:hover td': { bgcolor: EXCEL_SHEET.hoverBg },
                        }}
                      >
                        {LISTA_MEDICAMENTOS_COLUNAS.map((col) => (
                          <TableCell
                            key={col.key}
                            sx={{
                              ...cellSx,
                              bgcolor: rowBg ?? cellSx.bgcolor,
                              ...(col.key === 'medicamento'
                                ? {
                                    whiteSpace: 'pre-wrap',
                                    maxWidth: col.width + 40,
                                    minWidth: 180,
                                  }
                                : null),
                              ...(col.key === 'qtd'
                                ? { fontWeight: 700, textAlign: 'center', ...qtdBorder }
                                : null),
                              ...(col.key === 'validade' ? validadeBorder : null),
                            }}
                          >
                            {dash(String(linha[col.key] ?? ''))}
                          </TableCell>
                        ))}
                        <TableCell
                          sx={{
                            ...cellSx,
                            bgcolor: rowBg ?? cellSx.bgcolor,
                            textAlign: 'center',
                          }}
                        >
                          <Tooltip title="Movimentar estoque">
                            <IconButton
                              size="small"
                              color="primary"
                              aria-label={`Movimentar medicamento ${index + 1}`}
                              onClick={() => onMovimentarLinha?.(linha.id)}
                              sx={{ p: 0.35, color: EXCEL_SHEET.selectedCheck }}
                            >
                              <MovimentarIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Histórico de movimentações">
                            <IconButton
                              size="small"
                              aria-label={`Histórico de movimentações ${index + 1}`}
                              onClick={() => {
                                setHistoricoSeed(linha)
                                setHistoricoOpen(true)
                              }}
                              sx={{ p: 0.35, color: '#0f5c8c' }}
                            >
                              <HistoricoIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <IconButton
                            size="small"
                            aria-label={`Editar medicamento ${index + 1}`}
                            onClick={() => onEditLinha?.(linha.id)}
                            sx={{ p: 0.35 }}
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Excluir medicamento ${index + 1}`}
                            onClick={() => onDeleteLinha?.(linha.id)}
                            sx={{ p: 0.35 }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {linhasVisiveis.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={colCount} sx={{ ...cellSx, color: EXCEL_SHEET.mutedText }}>
                        {filtro.tipo === 'todos'
                          ? 'Nenhum medicamento'
                          : 'Nenhum medicamento neste filtro'}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}
      </Paper>

      <GerarDocumentoModal
        open={gerarOpen}
        disabled={value.linhas.length === 0}
        onClose={() => setGerarOpen(false)}
        onConfirm={async (formato) => {
          await downloadGerarDocumento(
            {
              titulo: 'Lista de medicamentos com preços',
              fileBaseName: 'Lista-Medicamentos',
              headers: LISTA_MEDICAMENTOS_COLUNAS.map((c) => c.label),
              columnWidths: LISTA_MEDICAMENTOS_COLUNAS.map((c) => c.width),
              rows: value.linhas.map((linha) =>
                LISTA_MEDICAMENTOS_COLUNAS.map((c) => String(linha[c.key] ?? '')),
              ),
            },
            formato,
          )
        }}
      />

      <ListaMedicamentoHistoricoMovimentacoesModal
        open={historicoOpen}
        value={value}
        seedLinha={historicoSeed}
        onClose={() => {
          setHistoricoOpen(false)
          setHistoricoSeed(null)
        }}
      />
    </Box>
  )
}
