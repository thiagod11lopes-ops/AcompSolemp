import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import PreviewIcon from '@mui/icons-material/Preview'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { MedicamentoBalancoCharts } from '@/components/clinica/MedicamentoBalancoCharts'
import { useClinicaAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useClinicaPedidos } from '@/hooks/useClinicaPedidos'
import { useClinicas } from '@/hooks/useCadastros'
import { clinicaPlanilhasLivresService } from '@/services/clinicaPlanilhasLivresService'
import {
  buildMedicamentoBalanco,
  createMedicamentoBalancoExemploInput,
  type BalancoPeriodoTipo,
} from '@/utils/medicamentoBalanco'
import { EMPTY_IMH_MEDICAMENTO_FORM } from '@/utils/imhMedicamentoForm'
import { EMPTY_LISTA_MEDICAMENTOS_FORM } from '@/utils/listaMedicamentosForm'

function toDateInputValue(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const

export default function ClinicaBalancoGeralPage() {
  const { user, isLoading: authLoading } = useClinicaAuth()
  const { mapPath } = usePortalPaths()
  const { data: clinicas = [], isLoading: clinicasLoading } = useClinicas()
  const clinica = clinicas.find((c) => c.id === user?.clinicaId)
  const isMedicamento =
    user?.perfil === 'MEDICAMENTO' || clinica?.tipo === 'medicamento'

  const clinicaId = user?.clinicaId ?? ''
  const { data: pedidos = [] } = useClinicaPedidos()

  const [periodoTipo, setPeriodoTipo] = useState<BalancoPeriodoTipo>('mes')
  const [referencia, setReferencia] = useState(() => new Date())
  const [mostrarExemplo, setMostrarExemplo] = useState(false)

  const anos = useMemo(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => y - i)
  }, [])

  const { data: planilhas, isError: planilhasError } = useQuery({
    queryKey: ['clinica-balanco-planilhas', clinicaId],
    queryFn: () => clinicaPlanilhasLivresService.getState(clinicaId, 'medicamento'),
    enabled: Boolean(clinicaId),
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  })

  const balanco = useMemo(() => {
    try {
      const input = mostrarExemplo
        ? createMedicamentoBalancoExemploInput(periodoTipo, referencia)
        : {
            listaMedicamentos: planilhas?.listaMedicamentos ?? EMPTY_LISTA_MEDICAMENTOS_FORM,
            imhMedicamento: planilhas?.imhMedicamento ?? EMPTY_IMH_MEDICAMENTO_FORM,
            pedidos: Array.isArray(pedidos) ? pedidos : [],
            periodoTipo,
            referencia,
          }
      return buildMedicamentoBalanco(input)
    } catch (err) {
      console.error('Falha ao montar balanço:', err)
      return buildMedicamentoBalanco({
        listaMedicamentos: EMPTY_LISTA_MEDICAMENTOS_FORM,
        imhMedicamento: EMPTY_IMH_MEDICAMENTO_FORM,
        pedidos: [],
        periodoTipo,
        referencia,
      })
    }
  }, [mostrarExemplo, planilhas, pedidos, periodoTipo, referencia])

  const animationKey = `${mostrarExemplo ? 'ex' : 'real'}-${periodoTipo}-${balanco.periodoLabel}`

  if (authLoading || clinicasLoading) return <LoadingSpinner />

  if (!user) {
    return <Navigate to={mapPath('/clinica/timelines')} replace />
  }

  if (!isMedicamento) {
    return <Navigate to={mapPath('/clinica/timelines')} replace />
  }

  return (
    <Box>
      <PageHeader
        title="Balanço Geral"
        subtitle={
          mostrarExemplo
            ? `Pré-visualização com dados de exemplo · ${balanco.periodoLabel}`
            : `Resumo do período: ${balanco.periodoLabel}`
        }
        titleAdornment={<AccountBalanceIcon color="primary" fontSize="small" />}
        action={
          <Tooltip
            title={
              mostrarExemplo
                ? 'Voltar aos dados reais'
                : 'Ver como fica o balanço com dados de exemplo'
            }
          >
            <Button
              size="small"
              variant={mostrarExemplo ? 'contained' : 'outlined'}
              startIcon={<PreviewIcon />}
              onClick={() => setMostrarExemplo((v) => !v)}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {mostrarExemplo ? 'Sair do exemplo' : 'Ver exemplo'}
            </Button>
          </Tooltip>
        }
      />

      {mostrarExemplo ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Exibindo dados fictícios para demonstração. Isso não altera estoque, IMH nem pedidos.
        </Alert>
      ) : null}

      {planilhasError && !mostrarExemplo ? (
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          Não foi possível carregar as planilhas. Os totais podem ficar zerados até recarregar.
        </Typography>
      ) : null}

      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          mb: 2.5,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          alignItems: 'center',
        }}
      >
        {mostrarExemplo ? (
          <Chip size="small" color="info" label="Modo exemplo" sx={{ fontWeight: 700 }} />
        ) : null}
        <ToggleButtonGroup
          exclusive
          size="small"
          value={periodoTipo}
          onChange={(_, next: BalancoPeriodoTipo | null) => {
            if (next) setPeriodoTipo(next)
          }}
        >
          <ToggleButton value="dia" sx={{ textTransform: 'none', px: 1.5 }}>
            Dia
          </ToggleButton>
          <ToggleButton value="mes" sx={{ textTransform: 'none', px: 1.5 }}>
            Mês
          </ToggleButton>
          <ToggleButton value="ano" sx={{ textTransform: 'none', px: 1.5 }}>
            Ano
          </ToggleButton>
        </ToggleButtonGroup>

        {periodoTipo === 'dia' ? (
          <TextField
            type="date"
            size="small"
            label="Data"
            value={toDateInputValue(referencia)}
            onChange={(e) => {
              const v = e.target.value
              if (!v) return
              const [y, m, d] = v.split('-').map(Number)
              setReferencia(new Date(y, m - 1, d))
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 170 }}
          />
        ) : null}

        {periodoTipo === 'mes' ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="balanco-mes-label">Mês</InputLabel>
              <Select
                labelId="balanco-mes-label"
                label="Mês"
                value={referencia.getMonth()}
                onChange={(e) => {
                  const next = new Date(referencia)
                  next.setMonth(Number(e.target.value))
                  setReferencia(next)
                }}
              >
                {MESES.map((nome, idx) => (
                  <MenuItem key={nome} value={idx}>
                    {nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel id="balanco-ano-mes-label">Ano</InputLabel>
              <Select
                labelId="balanco-ano-mes-label"
                label="Ano"
                value={referencia.getFullYear()}
                onChange={(e) => {
                  const next = new Date(referencia)
                  next.setFullYear(Number(e.target.value))
                  setReferencia(next)
                }}
              >
                {anos.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        ) : null}

        {periodoTipo === 'ano' ? (
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel id="balanco-ano-label">Ano</InputLabel>
            <Select
              labelId="balanco-ano-label"
              label="Ano"
              value={referencia.getFullYear()}
              onChange={(e) => {
                const next = new Date(referencia)
                next.setFullYear(Number(e.target.value))
                setReferencia(next)
              }}
            >
              {anos.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
      </Paper>

      <MedicamentoBalancoCharts balanco={balanco} animationKey={animationKey} />
    </Box>
  )
}
