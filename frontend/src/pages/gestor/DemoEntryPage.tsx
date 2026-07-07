import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Box } from '@mui/material'
import { useAuth } from '@/contexts/AuthContext'
import {
  DEMO_GESTOR_OVERVIEW_USER_ID,
  ensureDemoExampleCadastros,
  initDemoAppData,
} from '@/services/demoCadastrosService'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function DemoEntryPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { startDemo, startDemoGestorOverview, gestorUser, isLoading } = useAuth()
  const [erro, setErro] = useState('')

  const userId = params.get('userId')
  const titulo = params.get('titulo')

  useEffect(() => {
    if (isLoading || !gestorUser || !userId) return

    void (async () => {
      try {
        if (userId === DEMO_GESTOR_OVERVIEW_USER_ID) {
          const { route } = await startDemoGestorOverview(titulo ?? undefined)
          if (titulo) document.title = titulo
          navigate(route, { replace: true })
          return
        }

        await initDemoAppData()
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
  }, [gestorUser, isLoading, navigate, startDemo, startDemoGestorOverview, titulo, userId])

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
