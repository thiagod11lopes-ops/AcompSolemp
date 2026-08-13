import { useEffect, useMemo, useState } from 'react'
import {
  Close as CloseIcon,
  FilterAltOffOutlined as ClearFiltersIcon,
  HistoryOutlined as HistoryIcon,
} from '@mui/icons-material'
import {
  alpha,
  Box,
  Button,
  Chip,
  Dialog,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import type { ListaMedicamentosFormData, ListaMedicamentosLinha } from '@/types'
import {
  EMPTY_LISTA_MED_HISTORICO_FILTROS,
  filtrarHistoricoMovimentacoesListaMedicamentos,
  formatListaMedValidade,
  listarHistoricoMovimentacoesListaMedicamentos,
  type ListaMedicamentoHistoricoFiltros,
} from '@/utils/listaMedicamentosForm'

interface ListaMedicamentoHistoricoMovimentacoesModalProps {
  open: boolean
  value: ListaMedicamentosFormData
  /** Prefill dos filtros ao abrir a partir de uma linha */
  seedLinha?: ListaMedicamentosLinha | null
  onClose: () => void
}

function dash(value: string): string {
  const t = value.trim()
  return t || '—'
}

export function ListaMedicamentoHistoricoMovimentacoesModal({
  open,
  value,
  seedLinha = null,
  onClose,
}: ListaMedicamentoHistoricoMovimentacoesModalProps) {
  const theme = useTheme()
  const accent = '#0f5c8c'
  const [filtros, setFiltros] = useState<ListaMedicamentoHistoricoFiltros>(
    EMPTY_LISTA_MED_HISTORICO_FILTROS,
  )

  useEffect(() => {
    if (!open) return
    if (seedLinha) {
      setFiltros({
        ...EMPTY_LISTA_MED_HISTORICO_FILTROS,
        medicamento: seedLinha.medicamento.trim(),
        neb: seedLinha.neb.trim(),
        lote: seedLinha.lote.trim(),
        validade: seedLinha.validade.trim(),
        uf: seedLinha.uf.trim(),
      })
      return
    }
    setFiltros(EMPTY_LISTA_MED_HISTORICO_FILTROS)
  }, [open, seedLinha?.id])

  const todos = useMemo(
    () => listarHistoricoMovimentacoesListaMedicamentos(value),
    [value],
  )
  const filtrados = useMemo(
    () => filtrarHistoricoMovimentacoesListaMedicamentos(todos, filtros),
    [todos, filtros],
  )

  const filtrosAtivos = Object.values(filtros).some((v) => String(v).trim())

  const patchFiltro = (key: keyof ListaMedicamentoHistoricoFiltros, raw: string) => {
    if (key === 'tipo') {
      const tipo = raw === 'entrada' || raw === 'saida' ? raw : ''
      setFiltros((prev) => ({ ...prev, tipo }))
      return
    }
    const next =
      key === 'data' || key === 'validade' ? formatListaMedValidade(raw) : raw
    setFiltros((prev) => ({ ...prev, [key]: next }))
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(14px)',
            bgcolor: alpha('#041018', 0.58),
          },
        },
        paper: {
          elevation: 0,
          sx: {
            borderRadius: 4.5,
            overflow: 'hidden',
            border: `1px solid ${alpha(accent, 0.28)}`,
            boxShadow: `0 36px 110px ${alpha('#000', 0.42)}`,
            background: theme.palette.background.paper,
            maxHeight: '92vh',
          },
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          px: { xs: 2.5, sm: 3.25 },
          pt: 3.25,
          pb: 2,
          background: `
            radial-gradient(120% 90% at 0% 0%, ${alpha(accent, 0.26)} 0%, transparent 55%),
            radial-gradient(90% 70% at 100% 10%, ${alpha('#217346', 0.12)} 0%, transparent 50%),
            linear-gradient(165deg, ${alpha(accent, 0.1)} 0%, ${theme.palette.background.paper} 58%)
          `,
        }}
      >
        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Box
          sx={{
            width: 58,
            height: 58,
            borderRadius: '20px',
            display: 'grid',
            placeItems: 'center',
            color: accent,
            bgcolor: alpha(accent, 0.14),
            border: `1px solid ${alpha(accent, 0.28)}`,
            mb: 1.75,
            boxShadow: `0 10px 28px ${alpha(accent, 0.18)}`,
          }}
        >
          <HistoryIcon sx={{ fontSize: 30 }} />
        </Box>

        <Typography
          sx={{
            fontWeight: 900,
            fontSize: '1.28rem',
            letterSpacing: '-0.045em',
            lineHeight: 1.15,
          }}
        >
          Histórico de movimentações
        </Typography>
        <Typography
          sx={{ mt: 0.85, fontSize: '0.88rem', lineHeight: 1.5, color: 'text.secondary', maxWidth: 560 }}
        >
          Consulte entradas e saídas registradas. Filtre por data, medicamento, NEB, lote, validade
          e UF.
        </Typography>

        <Box sx={{ mt: 1.75, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip
            size="small"
            label={`${todos.length} registro(s)`}
            sx={{ fontWeight: 700, height: 24 }}
          />
          <Chip
            size="small"
            color={filtrosAtivos ? 'primary' : 'default'}
            label={`${filtrados.length} filtrado(s)`}
            sx={{ fontWeight: 700, height: 24 }}
          />
          {filtrosAtivos ? (
            <Button
              size="small"
              startIcon={<ClearFiltersIcon sx={{ fontSize: 16 }} />}
              onClick={() => setFiltros(EMPTY_LISTA_MED_HISTORICO_FILTROS)}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Limpar filtros
            </Button>
          ) : null}
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2.5, sm: 3.25 }, pt: 1.5, pb: 1 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 1.25,
          }}
        >
          <FormControl size="small" fullWidth>
            <InputLabel id="lista-med-hist-tipo-label">Tipo</InputLabel>
            <Select
              labelId="lista-med-hist-tipo-label"
              label="Tipo"
              value={filtros.tipo}
              onChange={(e) => patchFiltro('tipo', String(e.target.value))}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="entrada">Entrada</MenuItem>
              <MenuItem value="saida">Saída</MenuItem>
            </Select>
          </FormControl>
          {(
            [
              { key: 'data', label: 'Data', placeholder: 'dd/mm/aaaa' },
              { key: 'medicamento', label: 'Medicamento', placeholder: 'Nome' },
              { key: 'neb', label: 'NEB', placeholder: 'NEB' },
              { key: 'lote', label: 'LOTE', placeholder: 'Lote' },
              { key: 'validade', label: 'VALIDADE', placeholder: 'dd/mm/aaaa' },
              { key: 'uf', label: 'UF', placeholder: 'UF' },
            ] as const
          ).map((field) => (
            <TextField
              key={field.key}
              size="small"
              label={field.label}
              value={filtros[field.key]}
              placeholder={field.placeholder}
              onChange={(e) => patchFiltro(field.key, e.target.value)}
              fullWidth
              slotProps={
                field.key === 'data' || field.key === 'validade'
                  ? { htmlInput: { inputMode: 'numeric', maxLength: 10 } }
                  : undefined
              }
            />
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          pb: 2.75,
          pt: 0.5,
          overflow: 'auto',
          maxHeight: 'min(52vh, 520px)',
        }}
      >
        {filtrados.length === 0 ? (
          <Box
            sx={{
              py: 5,
              textAlign: 'center',
              borderRadius: 3,
              border: `1px dashed ${alpha(theme.palette.divider, 0.95)}`,
              bgcolor: alpha(theme.palette.common.black, 0.02),
            }}
          >
            <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
              {todos.length === 0
                ? 'Nenhuma movimentação registrada ainda.'
                : 'Nenhum registro corresponde aos filtros.'}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              border: `1px solid ${alpha(theme.palette.divider, 0.95)}`,
              borderRadius: 2.5,
              overflow: 'hidden',
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {[
                    'Data',
                    'Tipo',
                    'QTD',
                    'Medicamento',
                    'NEB',
                    'LOTE',
                    'VALIDADE',
                    'UF',
                    'Origem / Destino',
                    'Responsável',
                  ].map((label) => (
                    <TableCell
                      key={label}
                      sx={{
                        fontWeight: 800,
                        fontSize: 12,
                        bgcolor: alpha(accent, 0.06),
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtrados.map((item) => {
                  const entrada = item.tipo === 'entrada'
                  return (
                    <TableRow key={`${item.linhaId}-${item.movId}`} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {dash(item.data)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={entrada ? 'Entrada' : 'Saída'}
                          sx={{
                            height: 22,
                            fontWeight: 800,
                            bgcolor: entrada ? alpha('#0f7a4b', 0.14) : alpha('#c2410c', 0.14),
                            color: entrada ? '#0f7a4b' : '#c2410c',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {entrada ? '+' : '−'}
                        {dash(item.qtd)}
                      </TableCell>
                      <TableCell sx={{ minWidth: 160 }}>{dash(item.medicamento)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dash(item.neb)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dash(item.lote)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dash(item.validade)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dash(item.uf)}</TableCell>
                      <TableCell sx={{ minWidth: 140 }}>{dash(item.origemDestino)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dash(item.responsavel)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          px: { xs: 2.5, sm: 3.25 },
          pb: 2.5,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: 2.2,
            bgcolor: accent,
            '&:hover': { bgcolor: '#0c4a70' },
          }}
        >
          Fechar
        </Button>
      </Box>
    </Dialog>
  )
}
