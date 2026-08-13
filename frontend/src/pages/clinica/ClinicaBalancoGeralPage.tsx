import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import PreviewIcon from '@mui/icons-material/Preview'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useClinicaAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useClinicaPedidos } from '@/hooks/useClinicaPedidos'
import { useClinicas } from '@/hooks/useCadastros'
import { clinicaPlanilhasLivresService } from '@/services/clinicaPlanilhasLivresService'
import { formatCurrency } from '@/utils/format'
import {
  buildMedicamentoBalanco,
  createMedicamentoBalancoExemploInput,
  formatBalancoQtd,
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

function MetricCard({
  title,
  value,
  hint,
}: {
  title: string
  value: string
  hint?: string
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.25, lineHeight: 1.2 }}>
          {value}
        </Typography>
        {hint ? (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  )
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

      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
        Consumo IMH — PME
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          mb: 2.5,
        }}
      >
        <MetricCard title="Lançamentos" value={String(balanco.imh.lancamentos)} />
        <MetricCard title="QTD consumida" value={formatBalancoQtd(balanco.imh.qtdTotal)} />
        <MetricCard title="Valor total" value={formatCurrency(balanco.imh.valorTotal)} />
        <MetricCard
          title="Valor a indenizar"
          value={formatCurrency(balanco.imh.valorIndenizar)}
        />
      </Box>

      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
        Movimentações de estoque
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          mb: 2.5,
        }}
      >
        <MetricCard title="Movimentações" value={String(balanco.estoqueMov.movimentacoes)} />
        <MetricCard title="Entradas" value={formatBalancoQtd(balanco.estoqueMov.entradas)} />
        <MetricCard title="Saídas" value={formatBalancoQtd(balanco.estoqueMov.saidas)} />
        <MetricCard
          title="Saldo líquido"
          value={formatBalancoQtd(balanco.estoqueMov.saldoLiquido)}
        />
      </Box>

      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
        Pedidos / timelines
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          mb: 2.5,
        }}
      >
        <MetricCard title="Pedidos no período" value={String(balanco.pedidos.total)} />
        <MetricCard title="Em andamento" value={String(balanco.pedidos.emAndamento)} />
        <MetricCard title="Concluídos" value={String(balanco.pedidos.concluidos)} />
        <MetricCard title="Valor pedidos" value={formatCurrency(balanco.pedidos.valorTotal)} />
      </Box>

      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
        Posição atual de estoque
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Independente do filtro de período (foto atual da Lista de Medicamentos).
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' },
          mb: 2.5,
        }}
      >
        <MetricCard
          title="Itens com estoque"
          value={String(balanco.alertas.itensComEstoque)}
          hint={`Estimado: ${formatCurrency(balanco.alertas.valorEstoqueEstimado)}`}
        />
        <MetricCard
          title="Estoque baixo / zerado"
          value={`${balanco.alertas.estoqueBaixo} / ${balanco.alertas.estoqueZerado}`}
        />
        <MetricCard
          title="Validade vencida / próxima"
          value={`${balanco.alertas.validadeVencida} / ${balanco.alertas.validadeProxima}`}
        />
      </Box>

      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
        Top medicamentos no período (IMH)
      </Typography>
      <Paper variant="outlined" sx={{ overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Medicamento</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                QTD
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                Valor
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {balanco.imh.topMedicamentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhum lançamento IMH neste período.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              balanco.imh.topMedicamentos.map((item) => (
                <TableRow key={item.nome}>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell align="right">{formatBalancoQtd(item.qtd)}</TableCell>
                  <TableCell align="right">{formatCurrency(item.valor)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}
