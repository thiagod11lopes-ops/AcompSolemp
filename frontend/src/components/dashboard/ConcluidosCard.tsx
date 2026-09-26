import { DashboardRingCard, ringPct, ringScale } from '@/components/dashboard/DashboardRingCard'

interface ConcluidosCardProps {
  concluidos: number
  totalProcessos: number
  emAndamento: number
  valorConcluidos: number
  tempoMedioDias: number
  onClick?: () => void
}

/** Card Processos Concluídos — anéis no padrão do dashboard. */
export function ConcluidosCard({
  concluidos,
  totalProcessos,
  emAndamento,
  tempoMedioDias,
  onClick,
}: ConcluidosCardProps) {
  const taxaTempo =
    concluidos > 0
      ? Math.min(100, Math.max(2, (1 - Math.min(Math.max(tempoMedioDias, 1), 30) / 30) * 100))
      : 0

  return (
    <DashboardRingCard
      title="Processos Concluídos"
      value={concluidos}
      rings={[
        ringPct(concluidos, totalProcessos),
        ringPct(emAndamento, totalProcessos) || ringScale(concluidos, Math.max(totalProcessos, 1)),
        taxaTempo || ringScale(concluidos, Math.max(totalProcessos, 1)),
      ]}
      palette="success"
      chartMinHeight={180}
      onClick={onClick}
      ariaLabel={`Concluídos: ${concluidos} processos finalizados — ver detalhes`}
    />
  )
}
