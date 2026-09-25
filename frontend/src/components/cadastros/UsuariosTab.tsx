import { useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
import {
  CADASTRO_PERFIS,
  isCadastroEntidadeClinica,
  type CadastroPerfilOpcao,
} from '@/types/cadastroPerfis'
import {
  DEMO_CLINICA_EXEMPLO_ID,
  DEMO_MEDICAMENTO_EXEMPLO_ID,
  DEMO_EMPENHADO_EXEMPLO_ID,
  isDemoExampleUser,
} from '@/services/demoCadastrosService'
import { userHasPerfil, userPerfis } from '@/utils/userPerfis'
import { loginPerfilLabel } from '@/utils/loginPerfis'

interface RegistroCadastro {
  id: string
  nome: string
  email: string
  ativo: boolean
  tiposLabel: string
}

function podeCombinarOpcoes(atuais: CadastroPerfilOpcao[], nova: CadastroPerfilOpcao): boolean {
  if (atuais.some((o) => o.id === nova.id)) return true
  const todas = [...atuais, nova]
  const entidades = todas.filter((o) => isCadastroEntidadeClinica(o))
  const setores = todas.filter((o) => !isCadastroEntidadeClinica(o))
  if (entidades.length > 1) return false
  if (entidades.length > 0 && setores.length > 0) return false
  return true
}

export function UsuariosTab() {
  const theme = useTheme()
  const [filtroPerfilId, setFiltroPerfilId] = useState(CADASTRO_PERFIS[0]!.id)
  const [opcoesSelecionadas, setOpcoesSelecionadas] = useState<CadastroPerfilOpcao[]>([
    CADASTRO_PERFIS[0]!,
  ])
  const createUser = useCreatePortalUser()
  const deleteCadastro = useDeleteCadastro()
  const { data: clinicas = [] } = useClinicas()
  const { data: usuarios = [] } = useUsuarios()

  const filtroOpcao =
    CADASTRO_PERFIS.find((p) => p.id === filtroPerfilId) ?? CADASTRO_PERFIS[0]!
  const primaria = opcoesSelecionadas[0] ?? CADASTRO_PERFIS[0]!

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')
  const [registroExcluir, setRegistroExcluir] = useState<RegistroCadastro | null>(null)

  const resetFormFeedback = () => {
    setErro('')
    setSucesso('')
    setNome('')
    setEmail('')
    setRegistroExcluir(null)
  }

  const registros = useMemo<RegistroCadastro[]>(() => {
    if (filtroOpcao.isClinica || filtroOpcao.isMedicamento || filtroOpcao.isEmpenhado) {
      const perfilEntidade = filtroOpcao.isMedicamento
        ? 'MEDICAMENTO'
        : filtroOpcao.isEmpenhado
          ? 'EMPENHADO'
          : 'CLINICA'
      const tipoEntidade = filtroOpcao.isMedicamento
        ? 'medicamento'
        : filtroOpcao.isEmpenhado
          ? 'empenhado'
          : 'clinica'
      const usuariosEntidade = usuarios.filter(
        (u) => userHasPerfil(u, perfilEntidade) && u.ativo && !isDemoExampleUser(u),
      )
      return clinicas
        .filter(
          (clinica) =>
            clinica.id !== DEMO_CLINICA_EXEMPLO_ID &&
            clinica.id !== DEMO_MEDICAMENTO_EXEMPLO_ID &&
            clinica.id !== DEMO_EMPENHADO_EXEMPLO_ID &&
            (clinica.tipo ?? 'clinica') === tipoEntidade &&
            usuariosEntidade.some((u) => u.clinicaId === clinica.id),
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
            tiposLabel: loginPerfilLabel(perfilEntidade),
          }
        })
    }
    return usuarios
      .filter(
        (u) => userHasPerfil(u, filtroOpcao.perfil) && u.ativo && !isDemoExampleUser(u),
      )
      .map((u) => ({
        id: u.id,
        nome: u.nome,
        email: u.email?.trim() || '—',
        ativo: u.ativo,
        tiposLabel: userPerfis(u).map((p) => loginPerfilLabel(p)).join(', '),
      }))
  }, [filtroOpcao, clinicas, usuarios])

  const colunas = useMemo<ColumnDef<RegistroCadastro>[]>(
    () => [
      { accessorKey: 'nome', header: 'Nome' },
      {
        accessorKey: 'email',
        header: 'E-mail institucional',
        cell: ({ row }) => row.original.email,
      },
      {
        accessorKey: 'tiposLabel',
        header: 'Tipos autorizados',
        cell: ({ row }) => row.original.tiposLabel,
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
      if (opcoesSelecionadas.length === 0) {
        throw new Error('Selecione ao menos um tipo de cadastro')
      }
      await createUser.mutateAsync({
        nome,
        email,
        opcoes: opcoesSelecionadas,
      })
      const labels = opcoesSelecionadas.map((o) => o.label).join(', ')
      setSucesso(
        `Cadastro criado (${labels})! O usuário acessa a Timeline com este e-mail @marinha.mil.br, escolhendo um dos tipos autorizados.`,
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
        isEntidadeClinica: isCadastroEntidadeClinica(filtroOpcao),
        id: registroExcluir.id,
      })
      setSucesso(`Cadastro "${registroExcluir.nome}" excluído com sucesso.`)
      setRegistroExcluir(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir')
      setRegistroExcluir(null)
    }
  }

  const labelsSelecionados = opcoesSelecionadas.map((o) => o.label).join(', ')

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Compartilhe o link da Timeline com clínicas e setores:{' '}
        <strong>/clinica/timeline</strong>. Cada cadastro usa e-mail institucional @marinha.mil.br.
        O gestor pode autorizar <strong>mais de um tipo</strong> no mesmo usuário (ex.: Confecção de
        Solemp + Solemp em Rascunho).
      </Alert>

      <FormControl fullWidth size="small" sx={{ mb: 3, maxWidth: { sm: 420 } }}>
        <InputLabel id="cadastro-filtro-select-label">Filtrar lista por tipo</InputLabel>
        <Select
          labelId="cadastro-filtro-select-label"
          id="cadastro-filtro-select"
          label="Filtrar lista por tipo"
          value={filtroPerfilId}
          onChange={(e) => {
            setFiltroPerfilId(String(e.target.value))
            resetFormFeedback()
          }}
        >
          {CADASTRO_PERFIS.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

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
              Novo cadastro
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Selecione um ou mais tipos que o usuário poderá acessar. Clínica, Medicamento e
              Empenhado são exclusivos; setores da Div. de Material podem ser combinados.
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  multiple
                  options={CADASTRO_PERFIS}
                  value={opcoesSelecionadas}
                  disableCloseOnSelect
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  onChange={(_, next) => {
                    if (next.length === 0) {
                      setOpcoesSelecionadas([])
                      return
                    }
                    const last = next[next.length - 1]!
                    const prev = next.slice(0, -1)
                    if (!podeCombinarOpcoes(prev, last)) {
                      setErro(
                        isCadastroEntidadeClinica(last)
                          ? 'Clínica, Medicamento e Empenhado não podem ser combinados com setores nem entre si.'
                          : 'Não é possível misturar tipos de clínica com setores da Div. de Material.',
                      )
                      return
                    }
                    setErro('')
                    setOpcoesSelecionadas(next)
                  }}
                  slotProps={{ chip: { size: 'small' } }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tipos de cadastro"
                      placeholder="Selecione um ou mais"
                      helperText={
                        labelsSelecionados
                          ? `Autorizado: ${labelsSelecionados}`
                          : 'Escolha ao menos um tipo'
                      }
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label={primaria.campoNomeLabel}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder={primaria.campoNomePlaceholder}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  type="email"
                  label="E-mail institucional"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@marinha.mil.br"
                  helperText="Somente @marinha.mil.br — usado em /clinica/timeline"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={createUser.isPending || opcoesSelecionadas.length === 0}
                >
                  {createUser.isPending ? 'Cadastrando...' : 'Cadastrar usuário'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, px: 1 }}>
              {filtroOpcao.label} cadastrado(s)
            </Typography>
            <DataTable
              data={registros}
              columns={colunas}
              emptyMessage={`Nenhum cadastro de ${filtroOpcao.label} ainda.`}
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
            Deseja realmente excluir o cadastro de <strong>{registroExcluir?.nome}</strong>
            {registroExcluir?.email && registroExcluir.email !== '—'
              ? ` (${registroExcluir.email})`
              : ''}
            ? Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
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
