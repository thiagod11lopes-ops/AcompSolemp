import { useEffect, useMemo, useState } from 'react'
import { Close as CloseIcon } from '@mui/icons-material'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
        Histórico de movimentações
        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'grid', gap: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {filtrados.length} de {todos.length} registro(s)
          </Typography>
          {filtrosAtivos ? (
            <Button
              size="small"
              onClick={() => setFiltros(EMPTY_LISTA_MED_HISTORICO_FILTROS)}
              sx={{ textTransform: 'none' }}
            >
              Limpar filtros
            </Button>
          ) : null}
        </Box>

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

        <Box sx={{ overflow: 'auto', maxHeight: 'min(52vh, 480px)' }}>
          {filtrados.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              {todos.length === 0
                ? 'Nenhuma movimentação registrada ainda.'
                : 'Nenhum registro corresponde aos filtros.'}
            </Typography>
          ) : (
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
                    <TableCell key={label} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
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
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dash(item.data)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {entrada ? 'Entrada' : 'Saída'}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {entrada ? '+' : '−'}
                        {dash(item.qtd)}
                      </TableCell>
                      <TableCell>{dash(item.medicamento)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dash(item.neb)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dash(item.lote)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dash(item.validade)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dash(item.uf)}</TableCell>
                      <TableCell>{dash(item.origemDestino)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dash(item.responsavel)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button variant="contained" onClick={onClose} sx={{ textTransform: 'none' }}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
