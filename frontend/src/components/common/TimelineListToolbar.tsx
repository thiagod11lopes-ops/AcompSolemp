import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
} from '@mui/material'
import type {
  TimelineListExtraFilters,
  TimelineListFiltro,
} from '@/utils/timelineListFilter'

type Contagens = {
  emAndamento: number
  todas: number
  concluidas: number
  minhasPendencias: number
  atrasadas: number
}

interface TimelineListToolbarProps {
  filtro: TimelineListFiltro
  onFiltroChange: (filtro: TimelineListFiltro) => void
  contagens: Contagens
  extras: TimelineListExtraFilters
  onExtrasChange: (extras: TimelineListExtraFilters) => void
  clinicas?: Array<{ id: string; nome: string }>
  /** Exibe aba “Minhas pendências” (setores). */
  showMinhasPendencias?: boolean
  /** Exibe filtro por clínica (ordenador/financeiro). */
  showClinicaFilter?: boolean
}

export function TimelineListToolbar({
  filtro,
  onFiltroChange,
  contagens,
  extras,
  onExtrasChange,
  clinicas = [],
  showMinhasPendencias = true,
  showClinicaFilter = true,
}: TimelineListToolbarProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Tabs
        value={filtro}
        onChange={(_, value: TimelineListFiltro) => onFiltroChange(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        {showMinhasPendencias && (
          <Tab
            value="MINHAS_PENDENCIAS"
            label={`Minhas pendências (${contagens.minhasPendencias})`}
          />
        )}
        <Tab value="EM_ANDAMENTO" label={`Em andamento (${contagens.emAndamento})`} />
        <Tab value="ATRASADAS" label={`Atrasadas (${contagens.atrasadas})`} />
        <Tab value="TODAS" label={`Todas (${contagens.todas})`} />
        <Tab value="CONCLUIDAS" label={`Concluídas (${contagens.concluidas})`} />
      </Tabs>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        useFlexGap
        sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      >
        {showClinicaFilter && clinicas.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="timeline-filtro-clinica">Clínica</InputLabel>
            <Select
              labelId="timeline-filtro-clinica"
              label="Clínica"
              value={extras.clinicaId ?? ''}
              onChange={(e) =>
                onExtrasChange({
                  ...extras,
                  clinicaId: e.target.value ? String(e.target.value) : undefined,
                })
              }
            >
              <MenuItem value="">Todas as clínicas</MenuItem>
              {clinicas.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <TextField
          size="small"
          type="date"
          label="De"
          InputLabelProps={{ shrink: true }}
          value={extras.dataDe ?? ''}
          onChange={(e) =>
            onExtrasChange({
              ...extras,
              dataDe: e.target.value || undefined,
            })
          }
          sx={{ width: { xs: '100%', sm: 160 } }}
        />
        <TextField
          size="small"
          type="date"
          label="Até"
          InputLabelProps={{ shrink: true }}
          value={extras.dataAte ?? ''}
          onChange={(e) =>
            onExtrasChange({
              ...extras,
              dataAte: e.target.value || undefined,
            })
          }
          sx={{ width: { xs: '100%', sm: 160 } }}
        />
      </Stack>
    </Box>
  )
}
