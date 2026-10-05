import type { ReactNode } from 'react'
import { Box, Grid, Typography } from '@mui/material'
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
  /** Cards menores, numa faixa só, para o dashboard caber na tela. */
  compact?: boolean
}

export function MedicamentoBalancoCharts({
  balanco,
  pacientesPme,
  planilhasEmCorrecao,
  compact = false,
}: MedicamentoBalancoChartsProps) {
  const periodo = balanco.periodoLabel
  const cards: { title: string; value: string | number; subtitle: string; icon: ReactNode; color: string }[] = [
    {
      title: 'Pacientes PME',
      value: pacientesPme,
      subtitle: 'Cadastro da farmácia',
      icon: <PeopleAltOutlinedIcon />,
      color: premiumTokens.primary,
    },
    {
      title: 'Estoque baixo',
      value: balanco.alertas.estoqueBaixo,
      subtitle: 'Abaixo do limite definido',
      icon: <Inventory2OutlinedIcon />,
      color: premiumTokens.orange,
    },
    {
      title: 'Estoque zerado',
      value: balanco.alertas.estoqueZerado,
      subtitle: 'Itens sem saldo',
      icon: <RemoveShoppingCartOutlinedIcon />,
      color: premiumTokens.red,
    },
    {
      title: 'Validade vencida',
      value: balanco.alertas.validadeVencida,
      subtitle: 'Lotes já vencidos',
      icon: <EventBusyOutlinedIcon />,
      color: premiumTokens.red,
    },
    {
      title: 'Validade próxima',
      value: balanco.alertas.validadeProxima,
      subtitle: 'Dentro do aviso de cada item',
      icon: <EventOutlinedIcon />,
      color: premiumTokens.yellow,
    },
    {
      title: 'Planilhas em correção',
      value: planilhasEmCorrecao,
      subtitle: 'PME devolvida para corrigir',
      icon: <AssignmentReturnOutlinedIcon />,
      color: premiumTokens.purple,
    },
    {
      title: 'Lançamentos',
      value: balanco.imh.lancamentos,
      subtitle: 'Linhas da IMH PME',
      icon: <ReceiptLongOutlinedIcon />,
      color: premiumTokens.primary,
    },
    {
      title: 'Qtd. fornecida',
      value: formatBalancoQtd(balanco.imh.qtdTotal),
      subtitle: 'Soma da QTD das linhas',
      icon: <MedicationOutlinedIcon />,
      color: premiumTokens.primaryDark,
    },
    {
      title: 'Valor consumido',
      value: formatCurrency(balanco.imh.valorTotal),
      subtitle: 'Soma do total das linhas',
      icon: <PaymentsOutlinedIcon />,
      color: premiumTokens.green,
    },
    {
      title: 'A indenizar',
      value: formatCurrency(balanco.imh.valorIndenizar),
      subtitle: 'Soma do valor a indenizar',
      icon: <RequestQuoteOutlinedIcon />,
      color: premiumTokens.purple,
    },
  ]

  if (compact) {
    return (
      <Box
        sx={{
          display: 'grid',
          flexShrink: 0,
          gap: 1.25,
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(5, minmax(0, 1fr))',
            xl: 'repeat(10, minmax(0, 1fr))',
          },
        }}
      >
        {cards.map((card) => (
          <KpiCard key={card.title} dense title={card.title} value={card.value} icon={card.icon} color={card.color} />
        ))}
      </Box>
    )
  }

  const situacao = cards.slice(0, 6)
  const doPeriodo = cards.slice(6)

  return (
    <>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.25 }}>
        Situação da PME
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {situacao.map((card) => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, md: 4 }}>
            <KpiCard {...card} />
          </Grid>
        ))}
      </Grid>

      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.25 }}>
        Período: {periodo}
      </Typography>
      <Grid container spacing={2}>
        {doPeriodo.map((card) => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              title={card.title === 'Lançamentos' ? 'Lançamentos do período' : card.title === 'Qtd. fornecida' ? 'Quantidade fornecida' : card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              color={card.color}
            />
          </Grid>
        ))}
      </Grid>
    </>
  )
}
