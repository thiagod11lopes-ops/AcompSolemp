import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Box } from '@mui/material'
import { useAuth } from '@/contexts/AuthContext'
import { ensureDemoExampleCadastros } from '@/services/demoCadastrosService'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function DemoEntryPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { startDemo, gestorUser, isLoading } = useAuth()
  const [erro, setErro] = useState('')

  const userId = params.get('userId')
  const titulo = params.get('titulo')

  useEffect(() => {
    if (isLoading || !gestorUser || !userId) return

    void (async () => {
      try {
        await ensureDemoExampleCadastros()
        const { route } = await startDemo(userId, titulo ?? undefined)
        if (titulo) document.title = titulo
        navigate(route, { replace: true })
      } catch (error) {
        setErro(
          error instanceof Error ? error.message : 'Não foi possível iniciar a demonstração',
        )
      }
    })()
  }, [gestorUser, isLoading, navigate, startDemo, titulo, userId])

  if (isLoading) return <LoadingSpinner />
  if (!gestorUser) return <Navigate to="/login" replace />
  if (!userId) return <Navigate to="/gestor/dashboard" replace />

  if (erro) {
    return (
      <Box sx={{ p: 3, maxWidth: 480, mx: 'auto', mt: 8 }}>
        <Alert severity="error">{erro}</Alert>
      </Box>
    )
  }

  return <LoadingSpinner />
}
