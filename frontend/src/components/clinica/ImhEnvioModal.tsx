import {
  Box,
  Button,
  Dialog,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import SendIcon from '@mui/icons-material/Send'
import DownloadIcon from '@mui/icons-material/Download'
import DescriptionIcon from '@mui/icons-material/Description'
import { Fragment, useEffect, useMemo, useState } from 'react'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import { formatValorBrasileiro } from '@/utils/consumoMaterialOds'
import type { MesConsumoModelo } from '@/utils/consumoMaterialTemplate'
import {
  IMH_ASSINATURAS,
  IMH_COLUNAS,
  IMH_OBSERVACOES,
  buildImhPlanilhaFromConsumo,
  calcularTotalImh,
  createImhLinhaMaterial,
  type ImhCabecalho,
  type ImhColunaKey,
  type ImhLinha,
} from '@/utils/imhPlanilhaTemplate'
import {
  buildImhXlsxLinhas,
  getImhXlsxFileName,
} from '@/utils/imhXlsxLinha'
import { downloadImhXlsx } from '@/utils/imhXlsxExport'

interface ImhEnvioModalProps {
  open: boolean
  consumoRows: ConsumoMaterialRow[]
  mesReferencia?: MesConsumoModelo
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: () => void
}

const COLUNAS_PACIENTE: ImhColunaKey[] = [
  'numero',
  'nip',
  'iniciais',
  'data',
  'procedimento',
  'mapaSala',
  'danfe',
]

export function ImhEnvioModal({
  open,
  consumoRows,
  mesReferencia,
  isSubmitting = false,
  onClose,
  onConfirm,
}: ImhEnvioModalProps) {
  const [cabecalho, setCabecalho] = useState<ImhCabecalho>({
    numeroRelacao: '',
    pregaoTad: '',
    data: '',
    vigencia: '',
    processo: '',
    fornecedor: '',
  })
  const [linhas, setLinhas] = useState<ImhLinha[]>([])
  const [isGeneratingXlsx, setIsGeneratingXlsx] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || consumoRows.length === 0) return
    const planilha = buildImhPlanilhaFromConsumo(consumoRows, mesReferencia)
    setCabecalho(planilha.cabecalho)
    setLinhas(planilha.linhas)
    setExportError(null)
  }, [open, consumoRows, mesReferencia])

  const totalGeral = useMemo(() => calcularTotalImh(linhas), [linhas])

  const updateCabecalho = (field: keyof ImhCabecalho, value: string) => {
    setCabecalho((prev) => ({ ...prev, [field]: value }))
  }

  const updateLinha = (id: string, field: ImhColunaKey, value: string) => {
    setLinhas((prev) =>
      prev.map((linha) => (linha.id === id ? { ...linha, [field]: value } : linha)),
    )
  }

  const adicionarMaterial = (pacienteGrupoId: string) => {
    setLinhas((prev) => {
      const doGrupo = prev.filter((l) => l.pacienteGrupoId === pacienteGrupoId)
      const ultimoIndex = prev.findLastIndex((l) => l.pacienteGrupoId === pacienteGrupoId)
      const nova = createImhLinhaMaterial(pacienteGrupoId, doGrupo.length)
      const next = [...prev]
      next.splice(ultimoIndex + 1, 0, nova)
      return next
    })
  }

  const grupos = useMemo(() => {
    const ids: string[] = []
    for (const linha of linhas) {
      if (!ids.includes(linha.pacienteGrupoId)) ids.push(linha.pacienteGrupoId)
    }
    return ids
  }, [linhas])

  const handleGerarPlanilhaXlsx = async () => {
    setExportError(null)
    setIsGeneratingXlsx(true)
    try {
      const linhasXlsx = buildImhXlsxLinhas(consumoRows, linhas)
      await downloadImhXlsx(linhasXlsx, cabecalho, getImhXlsxFileName(cabecalho))
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Erro ao gerar planilha Excel')
    } finally {
      setIsGeneratingXlsx(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={isSubmitting || isGeneratingXlsx ? undefined : onClose}
      maxWidth={false}
      fullWidth
      slotProps={{
        paper: {
          sx: {
            width: 'min(96vw, 1400px)',
            maxHeight: '94vh',
            borderRadius: 3,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <Box
        sx={(theme) => ({
          px: 3,
          py: 2.5,
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 55%, ${theme.palette.secondary.main} 100%)`,
          color: 'white',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        })}
      >
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <DescriptionIcon sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Planilha IMH — Envio para Contabilidade
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.25 }}>
              {consumoRows.length} lançamento(s) selecionado(s) · Revise e preencha conforme modelo IMH
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} disabled={isSubmitting} sx={{ color: 'white' }} aria-label="Fechar">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 3, display: 'grid', gap: 2.5 }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            <TextField
              size="small"
              label="Nº"
              value={cabecalho.numeroRelacao}
              onChange={(e) => updateCabecalho('numeroRelacao', e.target.value)}
              disabled={isSubmitting}
            />
            <TextField
              size="small"
              label="PREGÃO/TAD"
              value={cabecalho.pregaoTad}
              onChange={(e) => updateCabecalho('pregaoTad', e.target.value)}
              disabled={isSubmitting}
            />
            <TextField
              size="small"
              label="DATA"
              value={cabecalho.data}
              onChange={(e) => updateCabecalho('data', e.target.value)}
              disabled={isSubmitting}
            />
            <TextField
              size="small"
              label="VIGÊNCIA"
              value={cabecalho.vigencia}
              onChange={(e) => updateCabecalho('vigencia', e.target.value)}
              disabled={isSubmitting}
            />
            <TextField
              size="small"
              label="PROCESSO"
              value={cabecalho.processo}
              onChange={(e) => updateCabecalho('processo', e.target.value)}
              disabled={isSubmitting}
            />
            <TextField
              size="small"
              label="FORNECEDOR"
              value={cabecalho.fornecedor}
              onChange={(e) => updateCabecalho('fornecedor', e.target.value)}
              disabled={isSubmitting}
            />
          </Box>
        </Paper>

        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ maxHeight: 'min(50vh, 480px)', borderRadius: 2 }}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 1200 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  colSpan={7}
                  align="center"
                  sx={{ bgcolor: '#0B3D91', color: 'white', fontWeight: 700, fontSize: '0.72rem' }}
                >
                  DADOS DO PACIENTE
                </TableCell>
                <TableCell
                  colSpan={7}
                  align="center"
                  sx={{ bgcolor: '#1565C0', color: 'white', fontWeight: 700, fontSize: '0.72rem' }}
                >
                  DADOS DO MATERIAL
                </TableCell>
              </TableRow>
              <TableRow>
                {IMH_COLUNAS.map((col) => (
                  <TableCell
                    key={col.key}
                    sx={{
                      bgcolor: alpha('#0B3D91', 0.9),
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.68rem',
                      whiteSpace: 'nowrap',
                      minWidth: col.width,
                    }}
                  >
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {grupos.map((grupoId) => {
                const linhasGrupo = linhas.filter((l) => l.pacienteGrupoId === grupoId)
                return (
                  <Fragment key={grupoId}>
                    {linhasGrupo.map((linha) => (
                      <TableRow key={linha.id} hover>
                        {IMH_COLUNAS.map((col) => {
                          const isPacienteCol = COLUNAS_PACIENTE.includes(col.key)
                          const readOnly = isPacienteCol && !linha.isLinhaPaciente

                          return (
                            <TableCell key={col.key} sx={{ p: 0.5, minWidth: col.width }}>
                              {readOnly ? (
                                <Box sx={{ minHeight: 32 }} />
                              ) : (
                                <TextField
                                  size="small"
                                  fullWidth
                                  variant="standard"
                                  value={linha[col.key as ImhColunaKey]}
                                  onChange={(e) =>
                                    updateLinha(linha.id, col.key as ImhColunaKey, e.target.value)
                                  }
                                  disabled={isSubmitting}
                                  slotProps={{
                                    input: {
                                      sx: { fontSize: '0.78rem', px: 0.5 },
                                    },
                                  }}
                                />
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={IMH_COLUNAS.length} sx={{ py: 0.5, borderBottom: 2, borderColor: 'divider' }}>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => adicionarMaterial(grupoId)}
                          disabled={isSubmitting}
                        >
                          Adicionar material ao paciente
                        </Button>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Total geral: {formatValorBrasileiro(totalGeral)}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleGerarPlanilhaXlsx}
            disabled={isSubmitting || isGeneratingXlsx || consumoRows.length === 0}
          >
            {isGeneratingXlsx ? 'Gerando planilha...' : 'Gerar planilha .xlsx'}
          </Button>
        </Box>
        {exportError && (
          <Typography variant="body2" color="error">
            {exportError}
          </Typography>
        )}

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Observação:
          </Typography>
          {IMH_OBSERVACOES.map((obs) => (
            <Typography key={obs} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {obs}
            </Typography>
          ))}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 2,
              mt: 3,
            }}
          >
            {IMH_ASSINATURAS.map((label) => (
              <Box key={label} sx={{ textAlign: 'center' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'text.primary', mb: 1, minHeight: 32 }} />
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>

      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
          bgcolor: 'background.paper',
        }}
      >
        <Button onClick={onClose} disabled={isSubmitting || isGeneratingXlsx} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleGerarPlanilhaXlsx}
          disabled={isSubmitting || isGeneratingXlsx || consumoRows.length === 0}
          sx={{ fontWeight: 600 }}
        >
          {isGeneratingXlsx ? 'Gerando...' : 'Gerar planilha .xlsx'}
        </Button>
        <Button
          variant="contained"
          size="large"
          startIcon={<SendIcon />}
          onClick={onConfirm}
          disabled={isSubmitting || isGeneratingXlsx || linhas.length === 0}
          sx={{ fontWeight: 700, px: 3 }}
        >
          {isSubmitting ? 'Enviando para IMH...' : 'Confirmar envio para IMH'}
        </Button>
      </Box>
    </Dialog>
  )
}
