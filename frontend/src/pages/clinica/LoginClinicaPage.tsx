import { Navigate } from 'react-router-dom'

/** Legado — acesso da clínica agora é via /clinica/timeline com e-mail institucional */
export default function LoginClinicaPage() {
  return <Navigate to="/clinica/timeline" replace />
}
