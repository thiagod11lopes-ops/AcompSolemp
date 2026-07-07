import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  alpha,
  useTheme,
  MenuItem,
  InputAdornment,
  Card,
  CardActionArea,
} from '@mui/material'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import CalculateIcon from '@mui/icons-material/Calculate'
import DrawIcon from '@mui/icons-material/Draw'
import EditNoteIcon from '@mui/icons-material/EditNote'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import PaymentsIcon from '@mui/icons-material/Payments'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import TimelineIcon from '@mui/icons-material/Timeline'
import { useEffect, useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useClinicas } from '@/hooks/useCadastros'
import { CADASTRO_PERFIS, type CadastroPerfilOpcao } from '@/types/cadastroPerfis'
import { getHomeRouteForPerfil } from '@/utils/perfilEtapa'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { authService } from '@/services/authService'

const PERFIL_ICONS: Record<string, ReactElement> = {
  clinica: <LocalHospitalIcon color="primary" sx={{ fontSize: 32 }} />,
  auditoria: <FactCheckIcon color="secondary" sx={{ fontSize: 32 }} />,
  contabilidade: <CalculateIcon color="warning" sx={{ fontSize: 32 }} />,
  confeccao: <EditNoteIcon color="info" sx={{ fontSize: 32 }} />,
  assinatura1: <DrawIcon color="warning" sx={{ fontSize: 32 }} />,
  assinatura2: <AssignmentTurnedInIcon color="warning" sx={{ fontSize: 32 }} />,
  sda: <AccountTreeIcon color="action" sx={{ fontSize: 32 }} />,
  financas: <PaymentsIcon color="success" sx={{ fontSize: 32 }} />,
}

interface PortalAccessModalProps {
  open: boolean
}

export function PortalAccessModal({ open }: PortalAccessModalProps) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { loginClinicaByClinica, loginClinicaWithGoogle, loginByPerfilNome, loginByPerfilWithGoogle } =
    useAuth()
  const { data: clinicas = [], refetch: refetchClinicas } = useClinicas()

  const [opcao, setOpcao] = useState<CadastroPerfilOpcao | null>(null)
  const [clinicaId, setClinicaId] = useState('')
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [erro, setErro] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const requiresGoogle = authService.requiresGoogleAuth()

  useEffect(() => {
    if (open) {
      setOpcao(null)
      setClinicaId('')
      setNome('')
      setSenha('')
      setErro('')
      setShowPassword(false)
      void refetchClinicas()
    }
  }, [open, refetchClinicas])

  const [loading, setLoading] = useState(false)

  const handleClinicaGoogleLogin = async () => {
    if (!clinicaId) {
      setErro('Selecione uma clínica')
      return
    }
    setGoogleLoading(true)
    setErro('')
    try {
      await loginClinicaWithGoogle(clinicaId)
      navigate('/clinica/timelines', { replace: true })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao entrar')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handlePerfilGoogleLogin = async () => {
    if (!opcao) return
    setGoogleLoading(true)
    setErro('')
    try {
      const user = await loginByPerfilWithGoogle(opcao.perfil)
      navigate(getHomeRouteForPerfil(user.perfil), { replace: true })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao entrar')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleClinicaLogin = async () => {
    if (!clinicaId) {
      setErro('Selecione uma clínica')
      return
    }
    setLoading(true)
    setErro('')
    try {
      await loginClinicaByClinica(clinicaId, senha)
      navigate('/clinica/timelines', { replace: true })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  const handlePerfilLogin = async () => {
    if (!opcao) return
    if (!nome.trim()) {
      setErro('Informe o nome cadastrado')
      return
    }
    setLoading(true)
    setErro('')
    try {
      const user = await loginByPerfilNome(nome, senha, opcao.perfil)
      navigate(getHomeRouteForPerfil(user.perfil), { replace: true })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  const voltar = () => {
    setOpcao(null)
    setClinicaId('')
    setNome('')
    setSenha('')
    setErro('')
  }

  return (
    <Dialog
      open={open}
      onClose={() => {}}
      maxWidth="md"
      fullWidth
      slotProps={{
        backdrop: { sx: { backdropFilter: 'blur(6px)' } },
        paper: {
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            background: `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${theme.palette.background.paper} 45%)`,
            boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
          },
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.primary.main, 0.06),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.15),
              color: 'primary.main',
            }}
          >
            <TimelineIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Acesso à Timeline
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {opcao ? opcao.label : 'Selecione o perfil cadastrado'}
            </Typography>
          </Box>
        </Box>
        {opcao && (
          <IconButton size="small" onClick={voltar}>
            <ArrowBackIcon />
          </IconButton>
        )}
      </Box>

      <DialogContent sx={{ pt: 3 }}>
        {!opcao && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1.5,
            }}
          >
            {CADASTRO_PERFIS.map((perfil) => (
              <Card
                key={perfil.id}
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  borderColor: alpha(theme.palette.primary.main, 0.25),
                  transition: 'all 0.2s',
                  height: '100%',
                  '&:hover': { borderColor: 'primary.main', boxShadow: 3 },
                }}
              >
                <CardActionArea
                  onClick={() => {
                    setOpcao(perfil)
                    setErro('')
                    if (perfil.isClinica) void refetchClinicas()
                  }}
                  sx={{ p: 1.75, height: '100%', alignItems: 'stretch' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box sx={{ flexShrink: 0, mt: 0.25 }}>
                      {PERFIL_ICONS[perfil.id] ?? <TimelineIcon sx={{ fontSize: 32 }} />}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                        {perfil.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {perfil.descricao}
                      </Typography>
                    </Box>
                  </Box>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        )}

        {opcao?.isClinica && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {requiresGoogle
                ? 'Selecione a clínica e entre com a conta Google cadastrada.'
                : 'Selecione a clínica e informe a senha cadastrada pelo gestor.'}
            </Typography>
            <TextField
              select
              fullWidth
              label="Clínica"
              value={clinicaId}
              onChange={(e) => {
                setClinicaId(e.target.value)
                setErro('')
              }}
              sx={{ mb: 2 }}
              helperText={
                clinicas.length === 0
                  ? 'Nenhuma clínica cadastrada. Cadastre em Gestor → Cadastros.'
                  : undefined
              }
            >
              {clinicas.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.nome}
                </MenuItem>
              ))}
            </TextField>
            {!requiresGoogle && (
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                label="Senha"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value)
                  setErro('')
                }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}
            {erro && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {erro}
              </Typography>
            )}
            {requiresGoogle ? (
              <Box sx={{ mt: 3 }}>
                <GoogleSignInButton
                  onClick={handleClinicaGoogleLogin}
                  loading={googleLoading}
                  label="Entrar com Google"
                />
              </Box>
            ) : (
              <Button
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 3 }}
                onClick={handleClinicaLogin}
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar como Clínica'}
              </Button>
            )}
          </Box>
        )}

        {opcao && !opcao.isClinica && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {requiresGoogle
                ? `Entre com a conta Google cadastrada para ${opcao.label}.`
                : `Informe o nome e a senha cadastrados pelo gestor para ${opcao.label}.`}
            </Typography>
            {!requiresGoogle && (
              <>
                <TextField
                  fullWidth
                  label={opcao.campoNomeLabel}
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value)
                    setErro('')
                  }}
                  placeholder={opcao.campoNomePlaceholder}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  label="Senha"
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value)
                    setErro('')
                  }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </>
            )}
            {erro && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {erro}
              </Typography>
            )}
            {requiresGoogle ? (
              <Box sx={{ mt: 3 }}>
                <GoogleSignInButton
                  onClick={handlePerfilGoogleLogin}
                  loading={googleLoading}
                  label="Entrar com Google"
                />
              </Box>
            ) : (
              <Button
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 3 }}
                onClick={handlePerfilLogin}
                disabled={loading}
              >
                {loading ? 'Entrando...' : `Entrar como ${opcao.label}`}
              </Button>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}
