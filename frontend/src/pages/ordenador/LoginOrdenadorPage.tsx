import { Navigate } from 'react-router-dom'

/** Legado — acesso dos setores agora é via /clinica/timeline com Google */
export default function LoginOrdenadorPage() {
  return <Navigate to="/clinica/timeline" replace />
}
