import { Navigate } from 'react-router-dom'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useClinicaAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useClinicas } from '@/hooks/useCadastros'
import DashboardPage from '@/pages/DashboardPage'

/** Dashboard da clínica logada — mesmos cards do gestor, só com dados dela. */
export default function ClinicaDashboardPage() {
  const { user, isLoading: authLoading } = useClinicaAuth()
  const { mapPath } = usePortalPaths()
  const { data: clinicas = [], isLoading: clinicasLoading } = useClinicas()

  if (authLoading || clinicasLoading) return <LoadingSpinner />
  if (!user?.clinicaId) {
    return <Navigate to={mapPath('/clinica/timelines')} replace />
  }

  const clinica = clinicas.find((c) => c.id === user.clinicaId)
  const nomeClinica = clinica?.nome?.trim() || 'sua clínica'

  return (
    <DashboardPage
      clinicaId={user.clinicaId}
      metricsEnabled={Boolean(user.clinicaId)}
      title="Dashboard"
      subtitle={`Indicadores exclusivos de ${nomeClinica}`}
    />
  )
}
