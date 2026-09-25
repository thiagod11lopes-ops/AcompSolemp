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
  Grid,
  IconButton,
  Paper,
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
import type { Clinica, User, UserRole } from '@/types'
import { userHasPerfil, userPerfis } from '@/utils/userPerfis'
import { loginPerfilLabel } from '@/utils/loginPerfis'

interface RegistroCadastro {
  id: string
  nome: string
  email: string
  ativo: boolean
  tiposLabel: string
  /** Exclusão de clínica/medicamento/empenhado usa o id da entidade */
  isEntidadeClinica: boolean
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

function buildRegistrosEntidade(
  filtroOpcao: CadastroPerfilOpcao,
  clinicas: Clinica[],
  usuarios: User[],
): RegistroCadastro[] {
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
        isEntidadeClinica: true,
      }
    })
}

function buildRegistrosSetor(perfis: UserRole[], usuarios: User[]): RegistroCadastro[] {
  if (perfis.length === 0) return []
  const vistos = new Set<string>()
  const resultado: RegistroCadastro[] = []
  for (const u of usuarios) {
    if (!u.ativo || isDemoExampleUser(u)) continue
    if (u.perfil === 'GESTOR' || u.perfil === 'ADMINISTRADOR') continue
    if (u.clinicaId) continue
    if (!perfis.some((perfil) => userHasPerfil(u, perfil))) continue
    if (vistos.has(u.id)) continue
    vistos.add(u.id)
    resultado.push({
      id: u.id,
      nome: u.nome,
      email: u.email?.trim() || '—',
      ativo: u.ativo,
      tiposLabel: userPerfis(u).map((p) => loginPerfilLabel(p)).join(', '),
      isEntidadeClinica: false,
    })
  }
  return resultado.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
}

export function UsuariosTab() {
  const theme = useTheme()
  const [opcoesSelecionadas, setOpcoesSelecionadas] = useState<CadastroPerfilOpcao[]>([
    CADASTRO_PERFIS[0]!,
  ])
  const createUser = useCreatePortalUser()
  const deleteCadastro = useDeleteCadastro()
  const { data: clinicas = [] } = useClinicas()
  const { data: usuarios = [] } = useUsuarios()

  const primaria = opcoesSelecionadas[0] ?? CADASTRO_PERFIS[0]!

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')
  const [registroExcluir, setRegistroExcluir] = useState<RegistroCadastro | null>(null)

  const registros = useMemo<RegistroCadastro[]>(() => {
    if (opcoesSelecionadas.length === 0) return []

    const entidade = opcoesSelecionadas.find((o) => isCadastroEntidadeClinica(o))
    if (entidade) {
      return buildRegistrosEntidade(entidade, clinicas, usuarios)
    }

    return buildRegistrosSetor(
      opcoesSelecionadas.map((o) => o.perfil),
      usuarios,
    )
  }, [opcoesSelecionadas, clinicas, usuarios])

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
        isEntidadeClinica: registroExcluir.isEntidadeClinica,
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
  const tituloLista =
    opcoesSelecionadas.length === 0
      ? 'Cadastrado(s)'
      : opcoesSelecionadas.length === 1
        ? `${opcoesSelecionadas[0]!.label} cadastrado(s)`
        : `${labelsSelecionados} — cadastrado(s)`
  const emptyMessage =
    opcoesSelecionadas.length === 0
      ? 'Selecione um tipo de cadastro para ver a lista.'
      : `Nenhum cadastro de ${labelsSelecionados} ainda.`

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Compartilhe o link da Timeline com clínicas e setores:{' '}
        <strong>/clinica/timeline</strong>. Cada cadastro usa e-mail institucional @marinha.mil.br.
        O gestor pode autorizar <strong>mais de um tipo</strong> no mesmo usuário (ex.: Confecção de
        Solemp + Solemp em Rascunho).
      </Alert>

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
              Empenhado são exclusivos; setores da Div. de Material podem ser combinados. A lista ao
              lado mostra todos os cadastros do tipo selecionado.
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
                      setErro('')
                      setSucesso('')
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
                    setSucesso('')
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
              {tituloLista}
            </Typography>
            <DataTable
              data={registros}
              columns={colunas}
              emptyMessage={emptyMessage}
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
