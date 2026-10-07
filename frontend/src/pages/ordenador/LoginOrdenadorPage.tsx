import { Navigate } from 'react-router-dom'

/** Legado — acesso dos setores agora é via /clinica/timeline com e-mail institucional */
export default function LoginOrdenadorPage() {
  return <Navigate to="/clinica/timeline" replace />
}
