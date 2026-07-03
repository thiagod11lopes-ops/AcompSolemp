import {
  Paper,
  Grid,
  TextField,
  MenuItem,
  Button,
  Box,
} from '@mui/material'
import FilterListIcon from '@mui/icons-material/FilterList'
import type { PedidoFilters } from '@/types'
import { useClinicas, useEmpresas, useMateriais, useUsuarios, useWorkflowEtapas } from '@/hooks/useCadastros'

interface ProcessFiltersProps {
  filters: PedidoFilters
  onChange: (filters: PedidoFilters) => void
}

export function ProcessFilters({ filters, onChange }: ProcessFiltersProps) {
  const { data: clinicas = [] } = useClinicas()
  const { data: empresas = [] } = useEmpresas()
  const { data: materiais = [] } = useMateriais()
  const { data: usuarios = [] } = useUsuarios()
  const { data: etapas = [] } = useWorkflowEtapas()

  const update = (key: keyof PedidoFilters, value: string) => {
    onChange({ ...filters, [key]: value || undefined })
  }

  const clear = () => onChange({})

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <FilterListIcon color="primary" />
        <strong>Filtros</strong>
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            size="small"
            label="Busca"
            value={filters.busca ?? ''}
            onChange={(e) => update('busca', e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            select
            size="small"
            label="Clínica"
            value={filters.clinicaId ?? ''}
            onChange={(e) => update('clinicaId', e.target.value)}
          >
            <MenuItem value="">Todas</MenuItem>
            {clinicas.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.nome}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            select
            size="small"
            label="Empresa"
            value={filters.empresaId ?? ''}
            onChange={(e) => update('empresaId', e.target.value)}
          >
            <MenuItem value="">Todas</MenuItem>
            {empresas.map((e) => (
              <MenuItem key={e.id} value={e.id}>
                {e.nomeFantasia}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            select
            size="small"
            label="Responsável"
            value={filters.responsavelId ?? ''}
            onChange={(e) => update('responsavelId', e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            {usuarios.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.nome}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            select
            size="small"
            label="Etapa"
            value={filters.etapaId ?? ''}
            onChange={(e) => update('etapaId', e.target.value)}
          >
            <MenuItem value="">Todas</MenuItem>
            {etapas.map((e) => (
              <MenuItem key={e.id} value={e.id}>
                {e.nome}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            select
            size="small"
            label="Status"
            value={filters.status ?? ''}
            onChange={(e) => update('status', e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="EM_ANDAMENTO">Em andamento</MenuItem>
            <MenuItem value="CONCLUIDO">Concluído</MenuItem>
            <MenuItem value="NO_PRAZO">No prazo</MenuItem>
            <MenuItem value="PROXIMO_VENCIMENTO">Próximo vencimento</MenuItem>
            <MenuItem value="ATRASADO">Atrasado</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            select
            size="small"
            label="Material"
            value={filters.materialId ?? ''}
            onChange={(e) => update('materialId', e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            {materiais.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.descricao}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Data início"
            slotProps={{ inputLabel: { shrink: true } }}
            value={filters.dataInicio ?? ''}
            onChange={(e) => update('dataInicio', e.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Button variant="outlined" onClick={clear} sx={{ height: '40px' }}>
            Limpar filtros
          </Button>
        </Grid>
      </Grid>
    </Paper>
  )
}
