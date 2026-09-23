import { useMemo, useState } from 'react'
import {
  Autocomplete,
  Box,
  CircularProgress,
  TextField,
  Typography,
  InputAdornment,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useQuery } from '@tanstack/react-query'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useClinicaAuth, useFinanceiroAuth, useGestorAuth, useOrdenadorAuth } from '@/contexts/AuthContext'
import { pedidoService } from '@/services/pedidoService'
import { clinicaPedidoService } from '@/services/clinicaPedidoService'
import { ordenadorService } from '@/services/ordenadorService'
import { financeiroService } from '@/services/financeiroService'
import {
  detailPathForSearchPortal,
  searchPedidosPorNumero,
  type GlobalSearchPortal,
  type ProcessSearchHit,
} from '@/utils/globalProcessSearch'
import type { PedidoComDetalhes } from '@/types'

interface GlobalProcessSearchProps {
  portal: GlobalSearchPortal
  /** Compacto na topbar da clínica. */
  dense?: boolean
}

function kindLabel(kind: ProcessSearchHit['kind']): string {
  if (kind === 'PED') return 'PED'
  if (kind === 'SOLEMP') return 'SOLEMP'
  return 'NF'
}

export function GlobalProcessSearch({ portal, dense = false }: GlobalProcessSearchProps) {
  const { isDemo, navigatePortal } = usePortalPaths()
  const { user: gestorUser } = useGestorAuth()
  const { user: clinicaUser } = useClinicaAuth()
  const { user: ordenadorUser } = useOrdenadorAuth()
  const { user: financeiroUser } = useFinanceiroAuth()

  const [input, setInput] = useState('')

  const clinicaId = clinicaUser?.clinicaId ?? ''
  const ordenadorId = ordenadorUser?.id ?? ''

  const enabled =
    portal === 'gestor'
      ? Boolean(gestorUser || isDemo)
      : portal === 'clinica'
        ? Boolean(clinicaId)
        : portal === 'ordenador'
          ? Boolean(ordenadorId)
          : Boolean(financeiroUser || isDemo)

  const { data: pedidos = [], isFetching } = useQuery({
    queryKey: ['global-process-search', portal, clinicaId, ordenadorId, isDemo],
    queryFn: async (): Promise<PedidoComDetalhes[]> => {
      if (portal === 'gestor') {
        return isDemo ? pedidoService.listDemo() : pedidoService.list()
      }
      if (portal === 'clinica') {
        return clinicaPedidoService.listByClinica(clinicaId)
      }
      if (portal === 'ordenador') {
        return ordenadorService.listTimelines(ordenadorId)
      }
      return financeiroService.listTimelines()
    },
    enabled,
    staleTime: 30_000,
  })

  const options = useMemo(
    () => (input.trim().length < 2 ? [] : searchPedidosPorNumero(pedidos, input)),
    [pedidos, input],
  )

  const goToHit = (hit: ProcessSearchHit | null) => {
    if (!hit) return
    navigatePortal(detailPathForSearchPortal(portal, hit.pedido.id))
    setInput('')
  }

  return (
    <Autocomplete
      size={dense ? 'small' : 'small'}
      options={options}
      filterOptions={(x) => x}
      getOptionLabel={(opt) =>
        typeof opt === 'string' ? opt : `${kindLabel(opt.kind)} ${opt.matchedValue}`
      }
      isOptionEqualToValue={(a, b) => a.pedido.id === b.pedido.id && a.kind === b.kind}
      inputValue={input}
      onInputChange={(_, value, reason) => {
        if (reason === 'reset') return
        setInput(value)
      }}
      onChange={(_, value) => {
        if (value && typeof value !== 'string') goToHit(value)
      }}
      noOptionsText={
        input.trim().length < 2
          ? 'Digite PED, SOLEMP ou NF'
          : isFetching
            ? 'Buscando…'
            : 'Nenhum processo encontrado'
      }
      sx={{
        width: { xs: 148, sm: 220, md: 280 },
        flexShrink: 0,
        '& .MuiInputBase-root': { bgcolor: 'background.default' },
      }}
      renderOption={(props, option) => {
        const { key, ...rest } = props as typeof props & { key?: string }
        return (
          <Box component="li" key={key ?? option.pedido.id} {...rest}>
            <Box sx={{ minWidth: 0, py: 0.25 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                {kindLabel(option.kind)} {option.matchedValue}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                PED {option.pedido.numero}
                {option.pedido.solemp?.numero
                  ? ` · SOLEMP ${option.pedido.solemp.numero}`
                  : ''}
                {option.pedido.notaFiscal?.numero
                  ? ` · NF ${option.pedido.notaFiscal.numero}`
                  : ''}
              </Typography>
            </Box>
          </Box>
        )
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="PED, SOLEMP ou NF"
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {isFetching ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  )
}
