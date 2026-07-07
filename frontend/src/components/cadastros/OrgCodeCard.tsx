import {
  Alert,
  Box,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useEffect, useState } from 'react'
import { authService } from '@/services/authService'
import { useFirebaseDataSource } from '@/config/dataSource'
import { syncOrgCodePublicIndex } from '@/data/persistence/tenantPersistence'
import { loadAppData } from '@/mocks/seed'

/** Exibe o código da organização para compartilhar com clínica/ordenadores */
export function OrgCodeCard() {
  const theme = useTheme()
  const [copied, setCopied] = useState(false)
  const isFirebase = useFirebaseDataSource()
  const orgCode = authService.getOrgCode()

  useEffect(() => {
    if (!isFirebase || !orgCode) return
    void authService
      .ensureGestorFirebaseSession({ interactive: false })
      .then(() => syncOrgCodePublicIndex(loadAppData()))
      .catch((error) => {
        console.error('[Firebase] Falha ao publicar cadastros no código da organização:', error)
      })
  }, [isFirebase, orgCode])

  if (!isFirebase || !orgCode) return null

  const shareHint =
    'Usuários da Timeline usam este código na tela de acesso, junto com nome e senha cadastrados aqui.'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(orgCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignora
    }
  }

  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
        bgcolor: alpha(theme.palette.primary.main, 0.06),
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        Código da organização
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {shareHint}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 800, letterSpacing: 4, fontFamily: 'monospace' }}
        >
          {orgCode}
        </Typography>
        <Tooltip title={copied ? 'Copiado!' : 'Copiar código'}>
          <IconButton onClick={() => void handleCopy()} aria-label="Copiar código">
            <ContentCopyIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {copied && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Código copiado!
        </Alert>
      )}
    </Paper>
  )
}
