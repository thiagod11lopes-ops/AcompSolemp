import { Navigate } from 'react-router-dom'

/** Legado — acesso dos setores agora é via /clinica/timeline com e-mail @marinha.mil.br */
export default function LoginOrdenadorPage() {
  return <Navigate to="/clinica/timeline" replace />
}
