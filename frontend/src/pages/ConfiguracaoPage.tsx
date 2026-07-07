import { Navigate } from 'react-router-dom'
import { usePortalPaths } from '@/contexts/DemoRouteContext'

/** Redireciona rota legada de configuração */
export default function ConfiguracaoPage() {
  const { mapPath } = usePortalPaths()
  return <Navigate to={mapPath('/gestor/dashboard')} replace />
}
