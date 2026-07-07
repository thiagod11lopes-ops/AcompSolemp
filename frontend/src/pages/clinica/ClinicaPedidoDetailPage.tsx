import { Navigate, useParams } from 'react-router-dom'
import { usePortalPaths } from '@/contexts/DemoRouteContext'

/** Redireciona rota legada para a timeline do pedido */
export default function ClinicaPedidoDetailPage() {
  const { id = '' } = useParams()
  const { mapPath } = usePortalPaths()
  return <Navigate to={mapPath(`/clinica/timeline/${id}`)} replace />
}
