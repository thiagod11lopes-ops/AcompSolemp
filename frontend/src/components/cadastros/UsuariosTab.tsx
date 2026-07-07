import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import type { ColumnDef } from '@tanstack/react-table'
import { useCreatePortalUser, useCredenciaisPorLogin, useDeleteCadastro } from '@/hooks/useUsuarioCadastro'
import { useClinicas, useUsuarios } from '@/hooks/useCadastros'
import { DataTable } from '@/components/common/DataTable'
import { SenhaMascarada } from '@/components/cadastros/SenhaMascarada'
import { CADASTRO_PERFIS } from '@/types/cadastroPerfis'
import { OrgCodeCard } from '@/components/cadastros/OrgCodeCard'

interface RegistroCadastro {
  id: string
  nome: string
  login: string
  senha: string | null
  ativo: boolean
}

export function UsuariosTab() {
  const theme = useTheme()
  const [subTab, setSubTab] = useState(0)
  const createUser = useCreatePortalUser()
  const deleteCadastro = useDeleteCadastro()
  const { data: clinicas = [] } = useClinicas()
  const { data: usuarios = [] } = useUsuarios()
  const { data: credenciais = {} } = useCredenciaisPorLogin()

  const opcao = CADASTRO_PERFIS[subTab]

  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')
  const [registroExcluir, setRegistroExcluir] = useState<RegistroCadastro | null>(null)

  const registros = useMemo<RegistroCadastro[]>(() => {
    const senhaDoLogin = (login: string) =>
      login && login !== '—' ? credenciais[login] ?? null : null

    if (opcao.isClinica) {
      const usuariosClinica = usuarios.filter((u) => u.perfil === 'CLINICA')
      return clinicas.map((c) => {
        const user = usuariosClinica.find((u) => u.clinicaId === c.id)
        const login = user?.login ?? '—'
        return {
          id: c.id,
          nome: c.nome,
          login,
          senha: senhaDoLogin(login),
          ativo: user?.ativo ?? false,
        }
      })
    }
    return usuarios
      .filter((u) => u.perfil === opcao.perfil)
      .map((u) => ({
        id: u.id,
        nome: u.nome,
        login: u.login,
        senha: senhaDoLogin(u.login),
        ativo: u.ativo,
      }))
  }, [opcao, clinicas, usuarios, credenciais])

  const colunas = useMemo<ColumnDef<RegistroCadastro>[]>(
    () => [
      { accessorKey: 'nome', header: 'Nome' },
      { accessorKey: 'login', header: 'Login' },
      {
        id: 'senha',
        header: 'Senha',
        cell: ({ row }) => <SenhaMascarada senha={row.original.senha} />,
      },
      {
        accessorKey: 'ativo',
        header: 'Status',
        cell: ({ getValue }) => (getValue<boolean>() ? 'Ativo' : '—'),
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => (
          <Tooltip title="Excluir cadastro">
            <IconButton
              size="small"
              color="error"
              aria-label={`Excluir ${row.original.nome}`}
              onClick={() => setRegistroExcluir(row.original)}
            >
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [],
  )

  const handleSubmit = async () => {
    setErro('')
    setSucesso('')
    try {
      const result = await createUser.mutateAsync({
        nome,
        senha,
        opcao,
      })
      setSucesso(
        `${opcao.label} cadastrado(a)! Login de acesso: ${result.login} — use este login e a senha informada na Timeline.`,
      )
      setNome('')
      setSenha('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao cadastrar')
    }
  }

  const handleConfirmDelete = async () => {
    if (!registroExcluir) return
    setErro('')
    setSucesso('')
    try {
      await deleteCadastro.mutateAsync({
        isClinica: Boolean(opcao.isClinica),
        id: registroExcluir.id,
      })
      setSucesso(`${opcao.label} "${registroExcluir.nome}" excluído(a) com sucesso.`)
      setRegistroExcluir(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir')
      setRegistroExcluir(null)
    }
  }

  return (
    <Box>
      <OrgCodeCard />

      <Tabs
        value={subTab}
        onChange={(_, v) => {
          setSubTab(v)
          setErro('')
          setSucesso('')
          setNome('')
          setSenha('')
          setRegistroExcluir(null)
        }}
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {CADASTRO_PERFIS.map((p) => (
          <Tab key={p.id} label={p.label} />
        ))}
      </Tabs>

      {erro && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {erro}
        </Alert>
      )}
      {sucesso && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {sucesso}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              height: '100%',
              background: `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${theme.palette.background.paper} 50%)`,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Cadastrar {opcao.label}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {opcao.descricao}
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label={opcao.campoNomeLabel}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder={opcao.campoNomePlaceholder}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  type="password"
                  label="Senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  helperText="Mínimo 6 caracteres — usada no acesso à Timeline"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={createUser.isPending}
                >
                  {createUser.isPending
                    ? 'Cadastrando...'
                    : `Cadastrar ${opcao.label}`}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, px: 1 }}>
              {opcao.label} cadastrado(s)
            </Typography>
            <DataTable
              data={registros}
              columns={colunas}
              emptyMessage={`Nenhum cadastro de ${opcao.label} ainda.`}
            />
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={Boolean(registroExcluir)}
        onClose={() => !deleteCadastro.isPending && setRegistroExcluir(null)}
      >
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Deseja realmente excluir o cadastro de{' '}
            <strong>{opcao.label}</strong> <strong>{registroExcluir?.nome}</strong>
            {registroExcluir?.login && registroExcluir.login !== '—'
              ? ` (login: ${registroExcluir.login})`
              : ''}
            ? Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setRegistroExcluir(null)}
            disabled={deleteCadastro.isPending}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDelete}
            disabled={deleteCadastro.isPending}
          >
            {deleteCadastro.isPending ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
