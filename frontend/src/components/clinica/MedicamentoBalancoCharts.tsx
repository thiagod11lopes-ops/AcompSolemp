import { Grid, Typography } from '@mui/material'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import RemoveShoppingCartOutlinedIcon from '@mui/icons-material/RemoveShoppingCartOutlined'
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import MedicationOutlinedIcon from '@mui/icons-material/MedicationOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined'
import { KpiCard } from '@/components/common/KpiCard'
import { formatCurrency } from '@/utils/format'
import { formatBalancoQtd, type MedicamentoBalancoResult } from '@/utils/medicamentoBalanco'
import { premiumTokens } from '@/theme/tokens'

interface MedicamentoBalancoChartsProps {
  balanco: MedicamentoBalancoResult
  pacientesPme: number
  planilhasEmCorrecao: number
}

export function MedicamentoBalancoCharts({
  balanco,
  pacientesPme,
  planilhasEmCorrecao,
}: MedicamentoBalancoChartsProps) {
  const periodo = balanco.periodoLabel

  return (
    <>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.25 }}>
        Situação da PME
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KpiCard
            title="Pacientes PME"
            value={pacientesPme}
            subtitle="Cadastro da farmácia"
            icon={<PeopleAltOutlinedIcon />}
            color={premiumTokens.primary}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KpiCard
            title="Estoque baixo"
            value={balanco.alertas.estoqueBaixo}
            subtitle="Abaixo do limite definido"
            icon={<Inventory2OutlinedIcon />}
            color={premiumTokens.orange}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KpiCard
            title="Estoque zerado"
            value={balanco.alertas.estoqueZerado}
            subtitle="Itens sem saldo"
            icon={<RemoveShoppingCartOutlinedIcon />}
            color={premiumTokens.red}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KpiCard
            title="Validade vencida"
            value={balanco.alertas.validadeVencida}
            subtitle="Lotes já vencidos"
            icon={<EventBusyOutlinedIcon />}
            color={premiumTokens.red}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KpiCard
            title="Validade próxima"
            value={balanco.alertas.validadeProxima}
            subtitle="Dentro do aviso de cada item"
            icon={<EventOutlinedIcon />}
            color={premiumTokens.yellow}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KpiCard
            title="Planilhas em correção"
            value={planilhasEmCorrecao}
            subtitle="PME devolvida para corrigir"
            icon={<AssignmentReturnOutlinedIcon />}
            color={premiumTokens.purple}
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.25 }}>
        Período: {periodo}
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Lançamentos do período"
            value={balanco.imh.lancamentos}
            subtitle="Linhas da IMH PME"
            icon={<ReceiptLongOutlinedIcon />}
            color={premiumTokens.primary}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Quantidade fornecida"
            value={formatBalancoQtd(balanco.imh.qtdTotal)}
            subtitle="Soma da QTD das linhas"
            icon={<MedicationOutlinedIcon />}
            color={premiumTokens.primaryDark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Valor consumido"
            value={formatCurrency(balanco.imh.valorTotal)}
            subtitle="Soma do total das linhas"
            icon={<PaymentsOutlinedIcon />}
            color={premiumTokens.green}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="A indenizar"
            value={formatCurrency(balanco.imh.valorIndenizar)}
            subtitle="Soma do valor a indenizar"
            icon={<RequestQuoteOutlinedIcon />}
            color={premiumTokens.purple}
          />
        </Grid>
      </Grid>
    </>
  )
}
