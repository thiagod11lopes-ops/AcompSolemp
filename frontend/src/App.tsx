import { useEffect, useState, type CSSProperties } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AppRoutes } from '@/routes'
import { initDataLayer } from '@/data/initDataLayer'
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
        await initDataLayer()
        authService.bootstrap()
        if (!cancelled) setReady(true)
      } catch (e) {
        if (!cancelled) {
          const message =
            e instanceof Error
              ? e.message
              : typeof e === 'object' && e && 'message' in e
                ? String((e as { message: unknown }).message)
                : 'Falha ao iniciar o armazenamento'
          console.error('[AcompSolemp] Bootstrap falhou:', e)
          setError(message)
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
