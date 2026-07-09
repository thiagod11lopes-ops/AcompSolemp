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
import { useCreatePortalUser, useDeleteCadastro } from '@/hooks/useUsuarioCadastro'
import { useClinicas, useUsuarios } from '@/hooks/useCadastros'
import { DataTable } from '@/components/common/DataTable'
import { CADASTRO_PERFIS, isCadastroEntidadeClinica } from '@/types/cadastroPerfis'
import { DEMO_CLINICA_EXEMPLO_ID, isDemoExampleUser } from '@/services/demoCadastrosService'

interface RegistroCadastro {
  id: string
  nome: string
  email: string
  ativo: boolean
}

export function UsuariosTab() {
  const theme = useTheme()
  const [subTab, setSubTab] = useState(0)
  const createUser = useCreatePortalUser()
  const deleteCadastro = useDeleteCadastro()
  const { data: clinicas = [] } = useClinicas()
  const { data: usuarios = [] } = useUsuarios()

  const opcao = CADASTRO_PERFIS[subTab]

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')
  const [registroExcluir, setRegistroExcluir] = useState<RegistroCadastro | null>(null)

  const registros = useMemo<RegistroCadastro[]>(() => {
    if (opcao.isClinica || opcao.isMedicamento) {
      const perfilEntidade = opcao.isMedicamento ? 'MEDICAMENTO' : 'CLINICA'
      const tipoEntidade = opcao.isMedicamento ? 'medicamento' : 'clinica'
      const usuariosEntidade = usuarios.filter(
        (u) => u.perfil === perfilEntidade && !isDemoExampleUser(u),
      )
      return clinicas
        .filter(
          (clinica) =>
            clinica.id !== DEMO_CLINICA_EXEMPLO_ID &&
            (clinica.tipo ?? 'clinica') === tipoEntidade,
        )
        .map((c) => {
          const user =
            usuariosEntidade.find((u) => u.clinicaId === c.id && u.email) ??
            usuariosEntidade.find((u) => u.clinicaId === c.id)
          return {
            id: c.id,
            nome: c.nome,
            email: user?.email?.trim() || '—',
            ativo: user?.ativo ?? false,
          }
        })
    }
    return usuarios
      .filter((u) => u.perfil === opcao.perfil && !isDemoExampleUser(u))
      .map((u) => ({
        id: u.id,
        nome: u.nome,
        email: u.email?.trim() || '—',
        ativo: u.ativo,
      }))
  }, [opcao, clinicas, usuarios])

  const colunas = useMemo<ColumnDef<RegistroCadastro>[]>(
    () => [
      { accessorKey: 'nome', header: 'Nome' },
      {
        accessorKey: 'email',
        header: 'E-mail Google',
        cell: ({ row }) => row.original.email,
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
      await createUser.mutateAsync({
        nome,
        email,
        opcao,
      })
      setSucesso(
        `${opcao.label} cadastrado(a)! O usuário deve acessar a Timeline com este e-mail Google.`,
      )
      setNome('')
      setEmail('')
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
        isEntidadeClinica: isCadastroEntidadeClinica(opcao),
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
      <Alert severity="info" sx={{ mb: 3 }}>
        Compartilhe o link da Timeline com clínicas e setores:{' '}
        <strong>/clinica/timeline</strong>. Cada cadastro usa o e-mail Google autorizado para entrar.
      </Alert>

      <Tabs
        value={subTab}
        onChange={(_, v) => {
          setSubTab(v)
          setErro('')
          setSucesso('')
          setNome('')
          setEmail('')
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
                  type="email"
                  label="E-mail Google"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  helperText="Conta Google que o usuário usará em /clinica/timeline"
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
            {registroExcluir?.email && registroExcluir.email !== '—'
              ? ` (${registroExcluir.email})`
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
