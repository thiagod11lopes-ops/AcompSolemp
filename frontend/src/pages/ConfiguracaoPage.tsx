import { Navigate } from 'react-router-dom'

/** Redireciona rota legada de configuração */
export default function ConfiguracaoPage() {
  return <Navigate to="/gestor/dashboard" replace />
}
