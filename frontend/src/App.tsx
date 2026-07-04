import { useEffect, useState, type CSSProperties } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AppRoutes } from '@/routes'
import { initAppData } from '@/mocks/seed'
import { authService } from '@/services/authService'
import { initStorage } from '@/storage/indexedDb'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

const bootstrapStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  fontFamily: 'system-ui, sans-serif',
  color: '#555',
}

function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        await initStorage()
        initAppData()
        authService.bootstrap()
        if (!cancelled) setReady(true)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Falha ao iniciar o armazenamento')
        }
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div style={{ ...bootstrapStyle, color: '#c62828' }}>
        {error}
      </div>
    )
  }

  if (!ready) {
    return <div style={bootstrapStyle}>Carregando dados...</div>
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
