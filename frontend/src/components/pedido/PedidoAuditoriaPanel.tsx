import { useMemo, useState } from 'react'
import {
  Box,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import HistoryEduRoundedIcon from '@mui/icons-material/HistoryEduRounded'
import { useQuery } from '@tanstack/react-query'
import { loadFreshAppData } from '@/mocks/seed'
import {
  labelAcaoAuditoria,
  listAuditoriaForPedido,
} from '@/utils/pedidoAuditoria'
import { formatDateTime } from '@/utils/format'
import type { PedidoAuditoriaAcao, PedidoAuditoriaEvento } from '@/types'

interface PedidoAuditoriaPanelProps {
  pedidoId: string
}

async function fetchAuditoria(pedidoId: string): Promise<PedidoAuditoriaEvento[]> {
  const data = await loadFreshAppData()
  return listAuditoriaForPedido(data, pedidoId)
}

export function PedidoAuditoriaPanel({ pedidoId }: PedidoAuditoriaPanelProps) {
  const [filtroAcao, setFiltroAcao] = useState<'TODAS' | PedidoAuditoriaAcao>('TODAS')
  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ['pedido-auditoria', pedidoId],
    queryFn: () => fetchAuditoria(pedidoId),
    enabled: Boolean(pedidoId),
    staleTime: 5_000,
  })

  const filtrados = useMemo(() => {
    if (filtroAcao === 'TODAS') return eventos
    return eventos.filter((e) => e.acao === filtroAcao)
  }, [eventos, filtroAcao])

  const acoesPresentes = useMemo(() => {
    const set = new Set(eventos.map((e) => e.acao))
    return [...set]
  }, [eventos])

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <HistoryEduRoundedIcon color="primary" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Auditoria do PED
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Quem mudou o quê e quando (registro permanente)
            </Typography>
          </Box>
        </Stack>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="aud-filtro-acao">Tipo</InputLabel>
          <Select
            labelId="aud-filtro-acao"
            label="Tipo"
            value={filtroAcao}
            onChange={(e) =>
              setFiltroAcao(e.target.value as 'TODAS' | PedidoAuditoriaAcao)
            }
          >
            <MenuItem value="TODAS">Todas as ações</MenuItem>
            {acoesPresentes.map((acao) => (
              <MenuItem key={acao} value={acao}>
                {labelAcaoAuditoria(acao)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Carregando auditoria…
        </Typography>
      ) : filtrados.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nenhum evento registrado neste PED ainda.
        </Typography>
      ) : (
        <Stack divider={<Divider flexItem />} spacing={0}>
          {filtrados.map((ev) => (
            <Box key={ev.id} sx={{ py: 1.5 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ sm: 'flex-start' }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      label={labelAcaoAuditoria(ev.acao)}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {ev.titulo}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>
                    {ev.usuarioNome || 'Sistema'}
                    {ev.etapaNome ? ` · ${ev.etapaNome}` : ''}
                  </Typography>
                  {ev.detalhe ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                      {ev.detalhe}
                    </Typography>
                  ) : null}
                  {ev.alteracao ? (
                    <Typography
                      variant="body2"
                      sx={{ mt: 0.35, fontWeight: 700, color: 'text.primary' }}
                    >
                      {ev.alteracao}
                    </Typography>
                  ) : null}
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ whiteSpace: 'nowrap', pt: 0.25 }}
                >
                  {formatDateTime(ev.em)}
                </Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  )
}
