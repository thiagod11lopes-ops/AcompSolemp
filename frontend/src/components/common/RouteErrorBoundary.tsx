import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Box, Button, Typography } from '@mui/material'

interface RouteErrorBoundaryProps {
  children: ReactNode
}

interface RouteErrorBoundaryState {
  error: Error | null
}

export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Erro ao renderizar página:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 3, maxWidth: 560 }}>
          <Typography variant="h6" gutterBottom>
            Não foi possível carregar esta página
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {this.state.error.message || 'Erro inesperado na interface.'}
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
        </Box>
      )
    }

    return this.props.children
  }
}
