import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import CloudDoneIcon from '@mui/icons-material/CloudDone'
import SyncIcon from '@mui/icons-material/Sync'
import DeleteIcon from '@mui/icons-material/Delete'
import { useState, type ReactNode } from 'react'
import { formatValorBrasileiro } from '@/utils/consumoMaterialOds'
import {
  IMH_COLUNAS,
  calcularTotalImh,
  type ImhCabecalho,
  type ImhColunaKey,
  type ImhLinha,
} from '@/utils/imhPlanilhaTemplate'
import type { InserirLinhaPosicao } from '@/hooks/usePlanilhaDraft'

const COLUNAS_PACIENTE: ImhColunaKey[] = [
  'numero',
  'nip',
  'iniciais',
  'data',
  'procedimento',
  'mapaSala',
  'danfe',
]

const CABECALHO_CAMPOS: { key: keyof ImhCabecalho; label: string }[] = [
  { key: 'numeroRelacao', label: 'Nº' },
  { key: 'pregaoTad', label: 'PREGÃO/TAD' },
  { key: 'data', label: 'DATA' },
  { key: 'vigencia', label: 'VIGÊNCIA' },
  { key: 'processo', label: 'PROCESSO' },
  { key: 'fornecedor', label: 'FORNECEDOR' },
]

const ACOES_COL_WIDTH = 52

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
  savedAt: string | null
  isSaving: boolean
  disabled?: boolean
  exportError?: string | null
  onClose: () => void
  onCabecalhoChange: (field: keyof ImhCabecalho, value: string) => void
  onLinhaChange: (id: string, field: ImhColunaKey, value: string) => void
  onInserirLinha: (linhaId: string, position: InserirLinhaPosicao) => void
  onExcluirLinha: (linhaId: string) => void
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
  savedAt,
  isSaving,
  disabled = false,
  exportError,
  onClose,
  onCabecalhoChange,
  onLinhaChange,
  onInserirLinha,
  onExcluirLinha,
  footerActions,
}: PlanilhaEnvioModalShellProps) {
  const totalGeral = calcularTotalImh(linhas)
  const [addRowTargetId, setAddRowTargetId] = useState<string | null>(null)

  const handleContextMenu = (event: React.MouseEvent, linhaId: string) => {
    event.preventDefault()
    event.stopPropagation()
    if (disabled) return
    setAddRowTargetId(linhaId)
  }

  const handleInserir = (position: InserirLinhaPosicao) => {
    if (!addRowTargetId) return
    onInserirLinha(addRowTargetId, position)
    setAddRowTargetId(null)
  }

  return (
    <>
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
        <Toolbar variant="dense" sx={{ gap: 1, minHeight: 44, px: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            {icon}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {title}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                {lancamentoCount} lançamento(s)
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flex: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.9 }}>
              {isSaving ? (
                <SyncIcon sx={{ fontSize: 16 }} className="spin" />
              ) : (
                <CloudDoneIcon sx={{ fontSize: 16 }} />
              )}
              <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                {isSaving ? 'Salvando...' : savedAt ? `Salvo ${formatSavedAt(savedAt)}` : 'Rascunho local'}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
              Total: {formatValorBrasileiro(totalGeral)}
            </Typography>
            <IconButton edge="end" onClick={onClose} disabled={disabled} color="inherit" aria-label="Fechar">
              <CloseIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        sx={(theme) => ({
          flexShrink: 0,
          px: 2,
          py: 1.25,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: appBarColor === 'secondary' ? alpha(theme.palette.secondary.main, 0.08) : alpha(theme.palette.primary.main, 0.06),
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(6, 1fr)',
          },
          gap: 1,
        })}
      >
        {CABECALHO_CAMPOS.map(({ key, label }) => (
          <TextField
            key={key}
            size="small"
            fullWidth
            label={label}
            value={cabecalho[key]}
            onChange={(e) => onCabecalhoChange(key, e.target.value)}
            disabled={disabled}
            slotProps={{
              input: { sx: { fontSize: '0.85rem', bgcolor: 'background.paper' } },
            }}
          />
        ))}
      </Box>

      <TableContainer sx={{ flex: 1, minHeight: 0 }}>
        <Table stickyHeader size="small" sx={{ minWidth: 1600 + ACOES_COL_WIDTH }}>
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
              <TableCell
                rowSpan={2}
                align="center"
                sx={{
                  bgcolor: alpha('#000', 0.7),
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  minWidth: ACOES_COL_WIDTH,
                  width: ACOES_COL_WIDTH,
                  py: 0.75,
                  position: 'sticky',
                  top: 0,
                  zIndex: 4,
                  verticalAlign: 'middle',
                }}
              >
                AÇÕES
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
            {linhas.map((linha) => (
              <TableRow key={linha.id} hover sx={{ cursor: 'context-menu' }}>
                {IMH_COLUNAS.map((col) => {
                  const isPacienteCol = COLUNAS_PACIENTE.includes(col.key)
                  const readOnly = isPacienteCol && !linha.isLinhaPaciente

                  return (
                    <TableCell
                      key={col.key}
                      onContextMenu={(e) => handleContextMenu(e, linha.id)}
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
                              onContextMenu: (e: React.MouseEvent) =>
                                handleContextMenu(e, linha.id),
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
                <TableCell
                  align="center"
                  onContextMenu={(e) => handleContextMenu(e, linha.id)}
                  sx={{
                    p: 0.5,
                    width: ACOES_COL_WIDTH,
                    minWidth: ACOES_COL_WIDTH,
                    position: 'sticky',
                    right: 0,
                    bgcolor: 'background.paper',
                    borderLeft: 1,
                    borderColor: 'divider',
                    zIndex: 2,
                  }}
                >
                  <IconButton
                    size="small"
                    color="error"
                    disabled={disabled || linhas.length <= 1}
                    onClick={() => onExcluirLinha(linha.id)}
                    aria-label="Excluir linha"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
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
          <Typography variant="caption" color="text.secondary">
            Clique com o botão direito em uma linha para adicionar acima ou abaixo
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

      <Dialog
        open={addRowTargetId !== null}
        onClose={() => setAddRowTargetId(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          root: {
            sx: { zIndex: (theme) => theme.zIndex.modal + 2 },
          },
        }}
      >
        <DialogTitle>Adicionar linha</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Escolha onde inserir a nova linha em relação à linha selecionada.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexDirection: 'column', gap: 1, alignItems: 'stretch' }}>
          <Button variant="contained" onClick={() => handleInserir('above')} disabled={disabled}>
            Adicionar linha acima
          </Button>
          <Button variant="contained" onClick={() => handleInserir('below')} disabled={disabled}>
            Adicionar linha abaixo
          </Button>
          <Button onClick={() => setAddRowTargetId(null)} color="inherit">
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
