import { Navigate } from 'react-router-dom'

/** Redireciona rota legada para a aba de prazos no Workflow */
export default function ConfiguracaoPage() {
  return <Navigate to="/gestor/workflow?tab=prazos" replace />
}
