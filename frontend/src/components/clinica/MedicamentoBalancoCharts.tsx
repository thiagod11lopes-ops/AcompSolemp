import { useState, type ReactNode } from 'react'
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
import { MedicamentoCardDetalheDialog } from '@/components/clinica/MedicamentoCardDetalheDialog'
import { KpiCard } from '@/components/common/KpiCard'
import { formatCurrency } from '@/utils/format'
import {
  formatBalancoQtd,
  type MedicamentoBalancoResult,
  type PmeCardDetalhe,
  type PmeCardDetalheId,
} from '@/utils/medicamentoBalanco'
import { premiumTokens } from '@/theme/tokens'

interface MedicamentoBalancoChartsProps {
  balanco: MedicamentoBalancoResult
  pacientesPme: number
  planilhasEmCorrecao: number
  /** Cards menores, numa faixa só, para o dashboard caber na tela. */
  compact?: boolean
  detalhes?: PmeCardDetalhe[]
}

export function MedicamentoBalancoCharts({
  balanco,
  pacientesPme,
  planilhasEmCorrecao,
  compact = false,
  detalhes = [],
}: MedicamentoBalancoChartsProps) {
  const [cardAberto, setCardAberto] = useState<PmeCardDetalheId | null>(null)
  const periodo = balanco.periodoLabel
  const cards: {
    id: PmeCardDetalheId
    title: string
    value: string | number
    subtitle: string
    icon: ReactNode
    color: string
  }[] = [
    {
      id: 'pacientes',
      title: 'Pacientes atendidos',
      value: pacientesPme,
      subtitle: 'Cadastro da farmácia',
      icon: <PeopleAltOutlinedIcon />,
      color: premiumTokens.primary,
    },
    {
      id: 'estoque-baixo',
      title: 'Estoque baixo',
      value: balanco.alertas.estoqueBaixo,
      subtitle: 'Abaixo do limite definido',
      icon: <Inventory2OutlinedIcon />,
      color: premiumTokens.orange,
    },
    {
      id: 'estoque-zerado',
      title: 'Estoque zerado',
      value: balanco.alertas.estoqueZerado,
      subtitle: 'Itens sem saldo',
      icon: <RemoveShoppingCartOutlinedIcon />,
      color: premiumTokens.red,
    },
    {
      id: 'validade-vencida',
      title: 'Validade vencida',
      value: balanco.alertas.validadeVencida,
      subtitle: 'Lotes já vencidos',
      icon: <EventBusyOutlinedIcon />,
      color: premiumTokens.red,
    },
    {
      id: 'validade-proxima',
      title: 'Validade próxima',
      value: balanco.alertas.validadeProxima,
      subtitle: 'Dentro do aviso de cada item',
      icon: <EventOutlinedIcon />,
      color: premiumTokens.yellow,
    },
    {
      id: 'planilhas',
      title: 'Planilhas em correção',
      value: planilhasEmCorrecao,
      subtitle: 'PME devolvida para corrigir',
      icon: <AssignmentReturnOutlinedIcon />,
      color: premiumTokens.purple,
    },
    {
      id: 'lancamentos',
      title: 'Lançamentos',
      value: balanco.imh.lancamentos,
      subtitle: 'Linhas da IMH PME',
      icon: <ReceiptLongOutlinedIcon />,
      color: premiumTokens.primary,
    },
    {
      id: 'quantidade',
      title: 'Qtd. fornecida',
      value: formatBalancoQtd(balanco.imh.qtdTotal),
      subtitle: 'Soma da QTD das linhas',
      icon: <MedicationOutlinedIcon />,
      color: premiumTokens.primaryDark,
    },
    {
      id: 'consumido',
      title: 'Valor consumido',
      value: formatCurrency(balanco.imh.valorTotal),
      subtitle: 'Soma do total das linhas',
      icon: <PaymentsOutlinedIcon />,
      color: premiumTokens.green,
    },
    {
      id: 'indenizar',
      title: 'A indenizar',
      value: formatCurrency(balanco.imh.valorIndenizar),
      subtitle: 'Soma do valor a indenizar',
      icon: <RequestQuoteOutlinedIcon />,
      color: premiumTokens.purple,
    },
  ]

  if (compact) {
    const faixa = {
      display: 'grid',
      gap: 1.25,
      gridTemplateColumns: {
        xs: 'repeat(2, minmax(0, 1fr))',
        sm: 'repeat(5, minmax(0, 1fr))',
      },
    } as const
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, flexShrink: 0 }}>
        <Box sx={faixa}>
          {cards.slice(0, 5).map((card) => (
            <KpiCard
              key={card.id}
              dense
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
              onClick={() => setCardAberto(card.id)}
            />
          ))}
        </Box>
        <Box sx={faixa}>
          {cards.slice(5).map((card) => (
            <KpiCard
              key={card.id}
              dense
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
              onClick={() => setCardAberto(card.id)}
            />
          ))}
        </Box>
        <MedicamentoCardDetalheDialog
          detalhe={detalhes.find((item) => item.id === cardAberto) ?? null}
          onClose={() => setCardAberto(null)}
        />
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
          <Grid key={card.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <KpiCard
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              color={card.color}
              onClick={() => setCardAberto(card.id)}
            />
          </Grid>
        ))}
      </Grid>

      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.25 }}>
        Período: {periodo}
      </Typography>
      <Grid container spacing={2}>
        {doPeriodo.map((card) => (
          <Grid key={card.id} size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              title={card.title === 'Lançamentos' ? 'Lançamentos do período' : card.title === 'Qtd. fornecida' ? 'Quantidade fornecida' : card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              color={card.color}
              onClick={() => setCardAberto(card.id)}
            />
          </Grid>
        ))}
      </Grid>
      <MedicamentoCardDetalheDialog
        detalhe={detalhes.find((item) => item.id === cardAberto) ?? null}
        onClose={() => setCardAberto(null)}
      />
    </>
  )
}
