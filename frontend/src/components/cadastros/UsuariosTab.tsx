import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import GavelIcon from '@mui/icons-material/Gavel'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import {
  useCreateClinicaUser,
  useCreateOrdenadorUser,
  useCreateFinanceiroUser,
} from '@/hooks/useUsuarioCadastro'

export function UsuariosTab() {
  const theme = useTheme()
  const [subTab, setSubTab] = useState(0)
  const createClinica = useCreateClinicaUser()
  const createOrdenador = useCreateOrdenadorUser()
  const createFinanceiro = useCreateFinanceiroUser()

  const [nomeClinica, setNomeClinica] = useState('')
  const [senhaClinica, setSenhaClinica] = useState('')
  const [nomeOrdenador, setNomeOrdenador] = useState('')
  const [senhaOrdenador, setSenhaOrdenador] = useState('')
  const [nomeFinanceiro, setNomeFinanceiro] = useState('')
  const [senhaFinanceiro, setSenhaFinanceiro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  const handleCreateClinica = async () => {
    setErro('')
    setSucesso('')
    try {
      const result = await createClinica.mutateAsync({
        nomeClinica,
        senha: senhaClinica,
      })
      setSucesso(
        `Clínica cadastrada! Login de acesso: ${result.login} — use este login e a senha no Portal da Clínica.`,
      )
      setNomeClinica('')
      setSenhaClinica('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao cadastrar')
    }
  }

  const handleCreateOrdenador = async () => {
    setErro('')
    setSucesso('')
    try {
      const result = await createOrdenador.mutateAsync({
        nome: nomeOrdenador,
        senha: senhaOrdenador,
      })
      setSucesso(
        `Ordenador cadastrado! Login de acesso: ${result.login} — use este login e a senha no Portal do Ordenador.`,
      )
      setNomeOrdenador('')
      setSenhaOrdenador('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao cadastrar')
    }
  }

  const handleCreateFinanceiro = async () => {
    setErro('')
    setSucesso('')
    try {
      const result = await createFinanceiro.mutateAsync({
        nome: nomeFinanceiro,
        senha: senhaFinanceiro,
      })
      setSucesso(
        `Financeiro cadastrado! Login de acesso: ${result.login} — use este login e a senha no Portal do Financeiro.`,
      )
      setNomeFinanceiro('')
      setSenhaFinanceiro('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao cadastrar')
    }
  }

  return (
    <Box>
      <Tabs value={subTab} onChange={(_, v) => { setSubTab(v); setErro(''); setSucesso('') }} sx={{ mb: 3 }}>
        <Tab icon={<LocalHospitalIcon />} iconPosition="start" label="Cadastrar Clínica" />
        <Tab icon={<GavelIcon />} iconPosition="start" label="Ordenador de Despesa" />
        <Tab icon={<AccountBalanceIcon />} iconPosition="start" label="Financeiro" />
      </Tabs>

      {erro && <Alert severity="error" sx={{ mb: 2 }}>{erro}</Alert>}
      {sucesso && <Alert severity="success" sx={{ mb: 2 }}>{sucesso}</Alert>}

      {subTab === 0 && (
        <Paper
          sx={{
            p: 3,
            maxWidth: 520,
            borderRadius: 3,
            background: `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${theme.palette.background.paper} 50%)`,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Acesso da Clínica
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Cadastre o nome da clínica e uma senha. A clínica usará o login gerado para acessar
            o portal com timeline e pedidos.
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Nome da clínica"
                value={nomeClinica}
                onChange={(e) => setNomeClinica(e.target.value)}
                placeholder="Ex.: Clínica de Ortopedia"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                type="password"
                label="Senha de acesso"
                value={senhaClinica}
                onChange={(e) => setSenhaClinica(e.target.value)}
                helperText="Mínimo 6 caracteres"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button
                variant="contained"
                onClick={handleCreateClinica}
                disabled={createClinica.isPending}
              >
                {createClinica.isPending ? 'Cadastrando...' : 'Cadastrar clínica'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {subTab === 1 && (
        <Paper
          sx={{
            p: 3,
            maxWidth: 520,
            borderRadius: 3,
            background: `linear-gradient(145deg, ${alpha(theme.palette.warning.main, 0.08)} 0%, ${theme.palette.background.paper} 50%)`,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Ordenador de Despesa
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Cadastre o nome do ordenador e uma senha. Ele verá todas as timelines com SOLEMP
            aguardando assinatura e poderá assinar para concluir os estágios correspondentes.
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Nome do ordenador"
                value={nomeOrdenador}
                onChange={(e) => setNomeOrdenador(e.target.value)}
                placeholder="Ex.: Capitão de Fragata Silva"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                type="password"
                label="Senha de acesso"
                value={senhaOrdenador}
                onChange={(e) => setSenhaOrdenador(e.target.value)}
                helperText="Mínimo 6 caracteres"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button
                variant="contained"
                color="warning"
                onClick={handleCreateOrdenador}
                disabled={createOrdenador.isPending}
              >
                {createOrdenador.isPending ? 'Cadastrando...' : 'Cadastrar ordenador'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {subTab === 2 && (
        <Paper
          sx={{
            p: 3,
            maxWidth: 520,
            borderRadius: 3,
            background: `linear-gradient(145deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${theme.palette.background.paper} 50%)`,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Financeiro
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Cadastre o nome do usuário financeiro e uma senha. Ele receberá notificações de
            pagamento pendente e poderá confirmar o pagamento da nota fiscal selecionando a SOLEMP.
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Nome do financeiro"
                value={nomeFinanceiro}
                onChange={(e) => setNomeFinanceiro(e.target.value)}
                placeholder="Ex.: Tenente Santos"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                type="password"
                label="Senha de acesso"
                value={senhaFinanceiro}
                onChange={(e) => setSenhaFinanceiro(e.target.value)}
                helperText="Mínimo 6 caracteres"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button
                variant="contained"
                color="success"
                onClick={handleCreateFinanceiro}
                disabled={createFinanceiro.isPending}
              >
                {createFinanceiro.isPending ? 'Cadastrando...' : 'Cadastrar financeiro'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  )
}
