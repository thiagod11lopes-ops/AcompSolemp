import { DashboardRingCard, ringPct, ringScale } from '@/components/dashboard/DashboardRingCard'

export interface EmAndamentoPorEtapaItem {
  etapa: string
  quantidade: number
  ordem: number
  /** Soma % A INDENIZAR quando a etapa é Auditoria ou IMH */
  valor?: number
}

interface EmAndamentoCardProps {
  total: number
  porEtapa: EmAndamentoPorEtapaItem[]
  onClick?: () => void
}

/** Card Em andamento — mesmo padrão visual dos anéis do dashboard. */
export function EmAndamentoCard({ total, porEtapa, onClick }: EmAndamentoCardProps) {
  const top = [...porEtapa].sort((a, b) => b.quantidade - a.quantidade)
  const a = top[0]?.quantidade ?? 0
  const b = top[1]?.quantidade ?? 0
  const c = top[2]?.quantidade ?? 0
  const denom = Math.max(total, 1)

  return (
    <DashboardRingCard
      title="Em Andamento"
      value={total}
      rings={[
        ringPct(a, denom) || ringScale(total, denom),
        ringPct(b, denom) || ringScale(total * 0.65, denom),
        ringPct(c, denom) || ringScale(total * 0.4, denom),
      ]}
      palette="warning"
      chartMinHeight={180}
      onClick={onClick}
      ariaLabel={`Em andamento: ${total} PEDs ativos — ver detalhes`}
    />
  )
}
