import {
  AppBar,
  Box,
  Button,
  Dialog,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
  alpha,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import CloudDoneIcon from '@mui/icons-material/CloudDone'
import SyncIcon from '@mui/icons-material/Sync'
import { Fragment, type ReactNode } from 'react'
import { formatValorBrasileiro } from '@/utils/consumoMaterialOds'
import {
  IMH_COLUNAS,
  calcularTotalImh,
  type ImhCabecalho,
  type ImhColunaKey,
  type ImhLinha,
} from '@/utils/imhPlanilhaTemplate'

const COLUNAS_PACIENTE: ImhColunaKey[] = [
  'numero',
  'nip',
  'iniciais',
  'data',
  'procedimento',
  'mapaSala',
  'danfe',
]

const CABECALHO_CAMPOS: { key: keyof ImhCabecalho; label: string; width: number }[] = [
  { key: 'numeroRelacao', label: 'Nº', width: 72 },
  { key: 'pregaoTad', label: 'PREGÃO/TAD', width: 140 },
  { key: 'data', label: 'DATA', width: 100 },
  { key: 'vigencia', label: 'VIGÊNCIA', width: 100 },
  { key: 'processo', label: 'PROCESSO', width: 140 },
  { key: 'fornecedor', label: 'FORNECEDOR', width: 160 },
]

function formatSavedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export interface PlanilhaEnvioModalShellProps {
  open: boolean
  title: string
  lancamentoCount: number
  icon: ReactNode
  appBarColor?: 'primary' | 'secondary'
  cabecalho: ImhCabecalho
  linhas: ImhLinha[]
  grupos: string[]
  savedAt: string | null
  isSaving: boolean
  disabled?: boolean
  exportError?: string | null
  onClose: () => void
  onCabecalhoChange: (field: keyof ImhCabecalho, value: string) => void
  onLinhaChange: (id: string, field: ImhColunaKey, value: string) => void
  onAdicionarMaterial: (pacienteGrupoId: string) => void
  footerActions: ReactNode
}

export function PlanilhaEnvioModalShell({
  open,
  title,
  lancamentoCount,
  icon,
  appBarColor = 'primary',
  cabecalho,
  linhas,
  grupos,
  savedAt,
  isSaving,
  disabled = false,
  exportError,
  onClose,
  onCabecalhoChange,
  onLinhaChange,
  onAdicionarMaterial,
  footerActions,
}: PlanilhaEnvioModalShellProps) {
  const totalGeral = calcularTotalImh(linhas)

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={disabled ? undefined : onClose}
      slotProps={{
        paper: {
          sx: { display: 'flex', flexDirection: 'column', bgcolor: 'background.default' },
        },
      }}
    >
      <AppBar position="static" color={appBarColor} elevation={1} sx={{ flexShrink: 0 }}>
        <Toolbar variant="dense" sx={{ gap: 1, minHeight: 48, px: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            {icon}
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {title}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                {lancamentoCount} lançamento(s)
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              flex: 1,
              overflow: 'auto',
              px: 1,
              '&::-webkit-scrollbar': { height: 4 },
            }}
          >
            {CABECALHO_CAMPOS.map(({ key, label, width }) => (
              <TextField
                key={key}
                size="small"
                label={label}
                value={cabecalho[key]}
                onChange={(e) => onCabecalhoChange(key, e.target.value)}
                disabled={disabled}
                sx={{
                  minWidth: width,
                  flexShrink: 0,
                  '& .MuiInputBase-root': { bgcolor: alpha('#fff', 0.12), borderRadius: 1 },
                  '& .MuiInputLabel-root': { color: alpha('#fff', 0.75) },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: '0.8rem', py: 0.75 },
                }}
              />
            ))}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.9 }}>
              {isSaving ? (
                <SyncIcon sx={{ fontSize: 16 }} className="spin" />
              ) : (
                <CloudDoneIcon sx={{ fontSize: 16 }} />
              )}
              <Typography variant="caption" sx={{ display: { xs: 'none', md: 'block' }, whiteSpace: 'nowrap' }}>
                {isSaving ? 'Salvando...' : savedAt ? `Salvo ${formatSavedAt(savedAt)}` : 'Rascunho local'}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700, display: { xs: 'none', lg: 'block' } }}>
              Total: {formatValorBrasileiro(totalGeral)}
            </Typography>
            <IconButton edge="end" onClick={onClose} disabled={disabled} color="inherit" aria-label="Fechar">
              <CloseIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <TableContainer sx={{ flex: 1, minHeight: 0 }}>
        <Table stickyHeader size="small" sx={{ minWidth: 1600 }}>
          <TableHead>
            <TableRow>
              <TableCell
                colSpan={7}
                align="center"
                sx={{
                  bgcolor: '#0B3D91',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  py: 0.75,
                  position: 'sticky',
                  top: 0,
                  zIndex: 3,
                }}
              >
                DADOS DO PACIENTE
              </TableCell>
              <TableCell
                colSpan={7}
                align="center"
                sx={{
                  bgcolor: '#1565C0',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  py: 0.75,
                  position: 'sticky',
                  top: 0,
                  zIndex: 3,
                }}
              >
                DADOS DO MATERIAL
              </TableCell>
            </TableRow>
            <TableRow>
              {IMH_COLUNAS.map((col) => (
                <TableCell
                  key={col.key}
                  sx={{
                    bgcolor: alpha('#0B3D91', 0.92),
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    whiteSpace: 'nowrap',
                    minWidth: col.width,
                    py: 0.75,
                    position: 'sticky',
                    top: 33,
                    zIndex: 3,
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
                    <TableRow key={linha.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      {IMH_COLUNAS.map((col) => {
                        const isPacienteCol = COLUNAS_PACIENTE.includes(col.key)
                        const readOnly = isPacienteCol && !linha.isLinhaPaciente

                        return (
                          <TableCell
                            key={col.key}
                            sx={{
                              p: 0,
                              minWidth: col.width,
                              verticalAlign: 'middle',
                              borderRight: 1,
                              borderColor: 'divider',
                            }}
                          >
                            {readOnly ? (
                              <Box sx={{ minHeight: 36, bgcolor: alpha('#000', 0.02) }} />
                            ) : (
                              <TextField
                                size="small"
                                fullWidth
                                variant="standard"
                                multiline={col.key === 'procedimento' || col.key === 'descricaoMaterial'}
                                maxRows={4}
                                value={linha[col.key as ImhColunaKey]}
                                onChange={(e) =>
                                  onLinhaChange(linha.id, col.key as ImhColunaKey, e.target.value)
                                }
                                disabled={disabled}
                                slotProps={{
                                  input: {
                                    disableUnderline: true,
                                    sx: {
                                      fontSize: '0.8rem',
                                      px: 1,
                                      py: 0.75,
                                      minHeight: 36,
                                    },
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
                    <TableCell
                      colSpan={IMH_COLUNAS.length}
                      sx={{ py: 0.25, bgcolor: alpha('#0B3D91', 0.04), borderBottom: 2, borderColor: 'divider' }}
                    >
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => onAdicionarMaterial(grupoId)}
                        disabled={disabled}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        + material
                      </Button>
                    </TableCell>
                  </TableRow>
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box
        sx={{
          flexShrink: 0,
          px: 2,
          py: 1,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          bgcolor: 'background.paper',
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Total: {formatValorBrasileiro(totalGeral)}
          </Typography>
          {exportError && (
            <Typography variant="body2" color="error">
              {exportError}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{footerActions}</Box>
      </Box>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </Dialog>
  )
}
