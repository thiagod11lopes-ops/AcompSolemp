import { Alert, Box, Button } from '@mui/material'
import ScienceIcon from '@mui/icons-material/Science'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CADASTRO_PERFIS } from '@/types/cadastroPerfis'
import { DEMO_BANNER_HEIGHT } from '@/contexts/DemoRouteContext'
import { exitDemoTab } from '@/utils/portalPaths'

export function DemoModeBanner() {
  const navigate = useNavigate()
  const { demoMode, endDemo } = useAuth()

  if (!demoMode) return null

  const perfilLabel =
    CADASTRO_PERFIS.find((p) => p.perfil === demoMode.authUser.perfil)?.label ??
    demoMode.authUser.perfil

  const handleExit = () => {
    exitDemoTab(endDemo, () => navigate('/gestor/dashboard'))
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: (t) => t.zIndex.drawer + 2,
        height: DEMO_BANNER_HEIGHT,
      }}
    >
      <Alert
        severity="warning"
        icon={<ScienceIcon fontSize="inherit" />}
        action={
          <Button color="inherit" size="small" onClick={handleExit} sx={{ fontWeight: 700 }}>
            {window.opener ? 'Fechar aba' : 'Voltar ao gestor'}
          </Button>
        }
        sx={{
          borderRadius: 0,
          py: 0,
          minHeight: DEMO_BANNER_HEIGHT,
          alignItems: 'center',
          '& .MuiAlert-message': { py: 0.5 },
        }}
      >
        Modo demonstração — {demoMode.authUser.nome} ({perfilLabel}). Dados locais (IndexedDB), sem
        sincronização com a nuvem.
      </Alert>
    </Box>
  )
}
