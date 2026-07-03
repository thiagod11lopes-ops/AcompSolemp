import { Navigate, useParams } from 'react-router-dom'

/** Redireciona rota legada para a timeline do pedido */
export default function ClinicaPedidoDetailPage() {
  const { id = '' } = useParams()
  return <Navigate to={`/clinica/timeline/${id}`} replace />
}
