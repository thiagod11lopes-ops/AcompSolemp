import { DashboardRingCard, ringScale } from '@/components/dashboard/DashboardRingCard'

export function PessoasAtendidasCard({ value }: { value: number }) {
  const cap = Math.max(value, 10)
  return (
    <DashboardRingCard
      title="Pessoas Atendidas"
      value={value}
      rings={[ringScale(value, cap), ringScale(value * 0.72, cap), ringScale(value * 0.45, cap)]}
      palette="brand"
      chartMinHeight={120}
    />
  )
}

export function ProcedimentosCard({ value }: { value: number }) {
  const cap = Math.max(value, 10)
  return (
    <DashboardRingCard
      title="Procedimentos"
      value={value}
      rings={[ringScale(value, cap), ringScale(value * 0.68, cap), ringScale(value * 0.42, cap)]}
      palette="success"
      chartMinHeight={120}
    />
  )
}
