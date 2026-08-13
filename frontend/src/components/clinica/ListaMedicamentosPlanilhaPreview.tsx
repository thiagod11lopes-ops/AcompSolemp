import { useMemo, useState } from 'react'
import {
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
  filterListaMedicamentosByEstoque,
  getListaMedEstoqueStatus,
  listaMedicamentosHasPreviewContent,
  type ListaMedEstoqueFiltro,
} from '@/utils/listaMedicamentosForm'
import { downloadGerarDocumento } from '@/utils/gerarDocumentoTabela'
import '@/components/clinica/spreadsheet-excel.css'

interface ListaMedicamentosPlanilhaPreviewProps {
  value: ListaMedicamentosFormData
  editingLinhaId?: string | null
  importing?: boolean
  onImportClick?: () => void
  onEditLinha?: (linhaId: string) => void
  onDeleteLinha?: (linhaId: string) => void
  onMovimentarLinha?: (linhaId: string) => void
}

function dash(value: string): string {
  const trimmed = value.trim()
  return trimmed || '—'
}

const ROW_ORANGE = '#fff3e0'
const ROW_RED = '#ffebee'
const ROW_ORANGE_HOVER = '#ffe0b2'
const ROW_RED_HOVER = '#ffcdd2'

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

export function ListaMedicamentosPlanilhaPreview({
  value,
  editingLinhaId = null,
  importing = false,
  onImportClick,
  onEditLinha,
  onDeleteLinha,
  onMovimentarLinha,
}: ListaMedicamentosPlanilhaPreviewProps) {
  const [filtro, setFiltro] = useState<ListaMedEstoqueFiltro>('todos')
  const [gerarOpen, setGerarOpen] = useState(false)
  const [historicoOpen, setHistoricoOpen] = useState(false)
  const [historicoSeed, setHistoricoSeed] = useState<ListaMedicamentosLinha | null>(null)
  const visible = listaMedicamentosHasPreviewContent(value)
  const contagem = useMemo(() => countListaMedEstoque(value), [value])
  const linhasVisiveis = useMemo(
    () => filterListaMedicamentosByEstoque(value, filtro),
    [value, filtro],
  )
  const colCount = LISTA_MEDICAMENTOS_COLUNAS.length + 1

  const toggleFiltro = (next: ListaMedEstoqueFiltro) => {
    setFiltro((prev) => (prev === next ? 'todos' : next))
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
            Lista de medicamentos com preços
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={`${value.linhas.length} medicamento(s)`}
            sx={{ height: 22, fontWeight: 600 }}
          />
          <Chip
            size="small"
            clickable
            label={`${contagem.baixo} laranja`}
            onClick={() => toggleFiltro('baixo')}
            sx={{
              height: 22,
              fontWeight: 700,
              bgcolor: filtro === 'baixo' ? '#fb8c00' : ROW_ORANGE,
              color: filtro === 'baixo' ? '#fff' : '#e65100',
              border: '1px solid #ffb74d',
            }}
          />
          <Chip
            size="small"
            clickable
            label={`${contagem.zerado} vermelho`}
            onClick={() => toggleFiltro('zerado')}
            sx={{
              height: 22,
              fontWeight: 700,
              bgcolor: filtro === 'zerado' ? '#e53935' : ROW_RED,
              color: filtro === 'zerado' ? '#fff' : '#c62828',
              border: '1px solid #ef9a9a',
            }}
          />
          {filtro !== 'todos' ? (
            <Chip
              size="small"
              variant="outlined"
              label="Mostrar todos"
              onClick={() => setFiltro('todos')}
              onDelete={() => setFiltro('todos')}
              sx={{ height: 22, fontWeight: 600 }}
            />
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
            startIcon={<HistoricoIcon sx={{ fontSize: 16 }} />}
            onClick={() => {
              setHistoricoSeed(null)
              setHistoricoOpen(true)
            }}
            sx={{
              ml: 0.5,
              height: 26,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 12,
              color: '#0f5c8c',
              borderColor: '#0f5c8c',
              bgcolor: '#fff',
            }}
          >
            Histórico de movimentações
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<GerarDocIcon sx={{ fontSize: 16 }} />}
            onClick={() => setGerarOpen(true)}
            disabled={!visible || value.linhas.length === 0}
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
                    const status = getListaMedEstoqueStatus(linha)
                    const rowBg =
                      status === 'zerado'
                        ? ROW_RED
                        : status === 'baixo'
                          ? ROW_ORANGE
                          : editing
                            ? EXCEL_SHEET.selectedBg
                            : undefined
                    const hoverBg =
                      status === 'zerado'
                        ? ROW_RED_HOVER
                        : status === 'baixo'
                          ? ROW_ORANGE_HOVER
                          : EXCEL_SHEET.hoverBg
                    return (
                      <TableRow
                        key={linha.id}
                        sx={{
                          bgcolor: rowBg,
                          '& td': { bgcolor: rowBg },
                          '&:hover td': { bgcolor: hoverBg },
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
                              ...(col.key === 'qtd' ? { fontWeight: 700, textAlign: 'center' } : null),
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
                        {filtro === 'todos'
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
