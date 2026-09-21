import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button } from '@mui/material'
import { useAuth } from '@/contexts/AuthContext'

/** Altura aproximada do banner (Alert denso) para layout fixed. */
export const IMPERSONATION_BANNER_HEIGHT = 40

export function ImpersonationBanner() {
  const navigate = useNavigate()
  const { impersonationTargetEmail, endImpersonation } = useAuth()
  const [leaving, setLeaving] = useState(false)

  if (!impersonationTargetEmail) return null

  const handleEnd = async () => {
    setLeaving(true)
    try {
      const result = await endImpersonation()
      navigate(result.route, { replace: true })
    } finally {
      setLeaving(false)
    }
  }

  return (
    <Alert
      severity="warning"
      sx={{ borderRadius: 0, py: 0.25 }}
      action={
        <Button color="inherit" size="small" disabled={leaving} onClick={() => void handleEnd()}>
          {leaving ? 'Saindo...' : 'Voltar ao super-admin'}
        </Button>
      }
    >
      Acessando como <strong>{impersonationTargetEmail}</strong>
    </Alert>
  )
}
