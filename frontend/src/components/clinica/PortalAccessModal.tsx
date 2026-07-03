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
import GavelIcon from '@mui/icons-material/Gavel'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import TimelineIcon from '@mui/icons-material/Timeline'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useClinicas } from '@/hooks/useCadastros'

type AccessStep = 'escolha' | 'clinica' | 'ordenador' | 'financeiro'

interface PortalAccessModalProps {
  open: boolean
  onClinicaSuccess?: () => void
}

export function PortalAccessModal({ open, onClinicaSuccess }: PortalAccessModalProps) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { loginClinicaByClinica, loginOrdenadorByNome, loginFinanceiroByNome } = useAuth()
  const { data: clinicas = [], refetch: refetchClinicas } = useClinicas()

  const [step, setStep] = useState<AccessStep>('escolha')
  const [clinicaId, setClinicaId] = useState('')
  const [senhaClinica, setSenhaClinica] = useState('')
  const [nomeOrdenador, setNomeOrdenador] = useState('')
  const [senhaOrdenador, setSenhaOrdenador] = useState('')
  const [nomeFinanceiro, setNomeFinanceiro] = useState('')
  const [senhaFinanceiro, setSenhaFinanceiro] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setStep('escolha')
      setClinicaId('')
      setSenhaClinica('')
      setNomeOrdenador('')
      setSenhaOrdenador('')
      setNomeFinanceiro('')
      setSenhaFinanceiro('')
      setErro('')
      setShowPassword(false)
      void refetchClinicas()
    }
  }, [open, refetchClinicas])

  const handleClinicaLogin = async () => {
    if (!clinicaId) {
      setErro('Selecione uma clínica')
      return
    }
    setLoading(true)
    setErro('')
    try {
      await loginClinicaByClinica(clinicaId, senhaClinica)
      onClinicaSuccess?.()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  const handleOrdenadorLogin = async () => {
    if (!nomeOrdenador.trim()) {
      setErro('Informe o nome do ordenador')
      return
    }
    setLoading(true)
    setErro('')
    try {
      await loginOrdenadorByNome(nomeOrdenador, senhaOrdenador)
      navigate('/ordenador/timelines', { replace: true })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  const handleFinanceiroLogin = async () => {
    if (!nomeFinanceiro.trim()) {
      setErro('Informe o nome do financeiro')
      return
    }
    setLoading(true)
    setErro('')
    try {
      await loginFinanceiroByNome(nomeFinanceiro, senhaFinanceiro)
      navigate('/financeiro/pagamentos', { replace: true })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {}}
      maxWidth="sm"
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
              Selecione como deseja entrar
            </Typography>
          </Box>
        </Box>
        {step !== 'escolha' && (
          <IconButton size="small" onClick={() => { setStep('escolha'); setErro('') }}>
            <ArrowBackIcon />
          </IconButton>
        )}
      </Box>

      <DialogContent sx={{ pt: 3 }}>
        {step === 'escolha' && (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: 3,
                borderColor: alpha(theme.palette.primary.main, 0.3),
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.main', boxShadow: 4 },
              }}
            >
              <CardActionArea
                onClick={() => {
                  setStep('clinica')
                  setErro('')
                  void refetchClinicas()
                }}
                sx={{ p: 2.5 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <LocalHospitalIcon color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Clínica
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Selecione sua clínica e informe a senha de acesso
                    </Typography>
                  </Box>
                </Box>
              </CardActionArea>
            </Card>

            <Card
              variant="outlined"
              sx={{
                borderRadius: 3,
                borderColor: alpha(theme.palette.warning.main, 0.4),
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'warning.main', boxShadow: 4 },
              }}
            >
              <CardActionArea onClick={() => { setStep('ordenador'); setErro('') }} sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <GavelIcon color="warning" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Ordenador de Despesa
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Informe seu nome e senha para assinar SOLEMPs
                    </Typography>
                  </Box>
                </Box>
              </CardActionArea>
            </Card>

            <Card
              variant="outlined"
              sx={{
                borderRadius: 3,
                borderColor: alpha(theme.palette.success.main, 0.4),
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'success.main', boxShadow: 4 },
              }}
            >
              <CardActionArea onClick={() => { setStep('financeiro'); setErro('') }} sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <AccountBalanceIcon color="success" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Financeiro
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Informe seu nome e senha para confirmar pagamentos pendentes
                    </Typography>
                  </Box>
                </Box>
              </CardActionArea>
            </Card>
          </Box>
        )}

        {step === 'clinica' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Escolha a clínica cadastrada e digite a senha definida pelo gestor.
            </Typography>
            <TextField
              select
              fullWidth
              label="Clínica"
              value={clinicaId}
              onChange={(e) => { setClinicaId(e.target.value); setErro('') }}
              sx={{ mb: 2 }}
              helperText={
                clinicas.length === 0
                  ? 'Nenhuma clínica cadastrada. Cadastre em Gestor → Cadastros → Usuários.'
                  : undefined
              }
            >
              {clinicas.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.nome}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Senha"
              value={senhaClinica}
              onChange={(e) => { setSenhaClinica(e.target.value); setErro('') }}
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
            {erro && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {erro}
              </Typography>
            )}
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
          </Box>
        )}

        {step === 'ordenador' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Digite o nome cadastrado pelo gestor e sua senha de acesso.
            </Typography>
            <TextField
              fullWidth
              label="Nome do ordenador"
              value={nomeOrdenador}
              onChange={(e) => { setNomeOrdenador(e.target.value); setErro('') }}
              sx={{ mb: 2 }}
              placeholder="Ex.: Capitão de Fragata Oliveira"
            />
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Senha"
              value={senhaOrdenador}
              onChange={(e) => { setSenhaOrdenador(e.target.value); setErro('') }}
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
            {erro && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {erro}
              </Typography>
            )}
            <Button
              fullWidth
              variant="contained"
              color="warning"
              size="large"
              sx={{ mt: 3 }}
              onClick={handleOrdenadorLogin}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar como Ordenador'}
            </Button>
          </Box>
        )}

        {step === 'financeiro' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Digite o nome cadastrado pelo gestor e sua senha de acesso.
            </Typography>
            <TextField
              fullWidth
              label="Nome do financeiro"
              value={nomeFinanceiro}
              onChange={(e) => { setNomeFinanceiro(e.target.value); setErro('') }}
              sx={{ mb: 2 }}
              placeholder="Ex.: Tenente Santos"
            />
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Senha"
              value={senhaFinanceiro}
              onChange={(e) => { setSenhaFinanceiro(e.target.value); setErro('') }}
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
            {erro && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {erro}
              </Typography>
            )}
            <Button
              fullWidth
              variant="contained"
              color="success"
              size="large"
              sx={{ mt: 3 }}
              onClick={handleFinanceiroLogin}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar como Financeiro'}
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}
