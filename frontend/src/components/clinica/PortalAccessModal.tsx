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
import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useClinicas, useUsuarios } from '@/hooks/useCadastros'
import { CADASTRO_PERFIS, type CadastroPerfilOpcao } from '@/types/cadastroPerfis'
import { getHomeRouteForPerfil } from '@/utils/perfilEtapa'
import { useFirebaseDataSource } from '@/config/dataSource'
import { initFirebase } from '@/firebase/app'
import { resolveOrgCodePublicData } from '@/data/persistence/tenantPersistence'
import { getStoredOrgCode, setStoredOrgCode, setTenantId } from '@/services/tenantService'
import type { OrgCodePublicClinica, OrgCodePublicUsuario } from '@/data/persistence/tenantPersistence'

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
  const { loginClinicaByClinica, loginByPerfilNome } = useAuth()
  const { data: clinicas = [], refetch: refetchClinicas } = useClinicas()
  const { data: usuarios = [], refetch: refetchUsuarios } = useUsuarios()
  const isFirebase = useFirebaseDataSource()

  const [opcao, setOpcao] = useState<CadastroPerfilOpcao | null>(null)
  const [orgCode, setOrgCode] = useState('')
  const [clinicaId, setClinicaId] = useState('')
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [publicClinicas, setPublicClinicas] = useState<OrgCodePublicClinica[]>([])
  const [publicUsuarios, setPublicUsuarios] = useState<OrgCodePublicUsuario[]>([])

  useEffect(() => {
    if (open) {
      setOpcao(null)
      const storedCode = getStoredOrgCode() ?? ''
      setOrgCode(storedCode)
      setClinicaId('')
      setNome('')
      setSenha('')
      setErro('')
      setShowPassword(false)
      setPublicClinicas([])
      setPublicUsuarios([])

      if (isFirebase && storedCode.trim()) {
        void loadOrgPublicData(storedCode)
      } else {
        void refetchClinicas()
        void refetchUsuarios()
      }
    }
  }, [open, isFirebase, refetchClinicas, refetchUsuarios])

  const loadOrgPublicData = async (code: string): Promise<boolean> => {
    const normalized = code.trim()
    if (!normalized) {
      setPublicClinicas([])
      setPublicUsuarios([])
      return false
    }

    initFirebase()
    const orgData = await resolveOrgCodePublicData(normalized)
    if (!orgData) {
      setErro('Código da organização inválido')
      setPublicClinicas([])
      setPublicUsuarios([])
      return false
    }

    setTenantId(orgData.tenantId)
    setStoredOrgCode(normalized)
    setPublicClinicas(orgData.clinicas)
    setPublicUsuarios(orgData.usuarios)
    setErro('')
    return true
  }

  const persistOrgCode = (value: string) => {
    setOrgCode(value.toUpperCase())
    if (value.trim()) setStoredOrgCode(value)
  }

  const ensureTenantDataLoaded = async (): Promise<boolean> => {
    if (!isFirebase) return true
    const code = orgCode.trim()
    if (!code) {
      setErro('Informe o código da organização')
      return false
    }
    return loadOrgPublicData(code)
  }

  const clinicasDisponiveis = isFirebase ? publicClinicas : clinicas

  const nomesDisponiveis = useMemo(() => {
    if (!opcao || opcao.isClinica) return []

    if (isFirebase) {
      return publicUsuarios
        .filter((user) => user.perfil === opcao.perfil)
        .map((user) => user.nome)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    }

    return usuarios
      .filter((user) => user.perfil === opcao.perfil && user.ativo)
      .map((user) => user.nome)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [opcao, isFirebase, publicUsuarios, usuarios])

  const orgCodeField = (
    <TextField
      fullWidth
      label="Código da organização"
      value={orgCode}
      onChange={(e) => {
        persistOrgCode(e.target.value)
        setErro('')
      }}
      placeholder="Ex.: ABC123"
      helperText="Fornecido pelo gestor geral da sua organização"
      sx={{ mb: 2 }}
      onBlur={() => {
        void ensureTenantDataLoaded()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') void ensureTenantDataLoaded()
      }}
    />
  )

  const passwordField = (
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
  )

  const handleClinicaLogin = async () => {
    if (!clinicaId) {
      setErro('Selecione uma clínica')
      return
    }
    if (isFirebase && !orgCode.trim()) {
      setErro('Informe o código da organização')
      return
    }
    setLoading(true)
    setErro('')
    try {
      if (isFirebase) {
        const ok = await ensureTenantDataLoaded()
        if (!ok) return
      }
      await loginClinicaByClinica(clinicaId, senha, orgCode.trim() || undefined)
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
      setErro('Selecione o nome cadastrado')
      return
    }
    if (isFirebase && !orgCode.trim()) {
      setErro('Informe o código da organização')
      return
    }
    setLoading(true)
    setErro('')
    try {
      if (isFirebase) {
        const ok = await ensureTenantDataLoaded()
        if (!ok) return
      }
      const user = await loginByPerfilNome(nome, senha, opcao.perfil, orgCode.trim() || undefined)
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
        {isFirebase && !opcao && (
          <Box sx={{ mb: 3 }}>
            {orgCodeField}
            <Typography variant="caption" color="text.secondary">
              Informe o código e depois selecione seu perfil.
            </Typography>
          </Box>
        )}

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
                    if (perfil.isClinica) {
                      if (isFirebase) void ensureTenantDataLoaded()
                      else void refetchClinicas()
                    } else {
                      if (isFirebase) void ensureTenantDataLoaded()
                      else void refetchUsuarios()
                    }
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
              Informe o código da organização, selecione a clínica e a senha cadastrada pelo gestor.
            </Typography>
            {isFirebase && orgCodeField}
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
                clinicasDisponiveis.length === 0
                  ? orgCode.trim()
                    ? 'Nenhuma clínica encontrada para este código. Confirme o código ou peça ao gestor para abrir Cadastros.'
                    : 'Informe o código da organização para carregar as clínicas.'
                  : undefined
              }
            >
              {clinicasDisponiveis.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.nome}
                </MenuItem>
              ))}
            </TextField>
            {passwordField}
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

        {opcao && !opcao.isClinica && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Informe o código da organização, nome e senha cadastrados pelo gestor para{' '}
              {opcao.label}.
            </Typography>
            {isFirebase && orgCodeField}
            <TextField
              select
              fullWidth
              label={opcao.campoNomeLabel}
              value={nome}
              onChange={(e) => {
                setNome(e.target.value)
                setErro('')
              }}
              sx={{ mb: 2 }}
              helperText={
                nomesDisponiveis.length === 0
                  ? isFirebase
                    ? orgCode.trim()
                      ? `Nenhum cadastro encontrado para ${opcao.label}. Peça ao gestor para abrir Cadastros.`
                      : 'Informe o código da organização para carregar os nomes.'
                    : `Nenhum cadastro encontrado para ${opcao.label}.`
                  : undefined
              }
            >
              {nomesDisponiveis.map((nomeOpcao) => (
                <MenuItem key={nomeOpcao} value={nomeOpcao}>
                  {nomeOpcao}
                </MenuItem>
              ))}
            </TextField>
            {passwordField}
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
              onClick={handlePerfilLogin}
              disabled={loading}
            >
              {loading ? 'Entrando...' : `Entrar como ${opcao.label}`}
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}
