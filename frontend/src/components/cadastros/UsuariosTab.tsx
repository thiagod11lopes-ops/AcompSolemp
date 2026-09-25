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
import type { Clinica, User } from '@/types'
import { userHasPerfil, userPerfis } from '@/utils/userPerfis'
import { loginPerfilLabel } from '@/utils/loginPerfis'
import { CLINICAS_HOSPITAL } from '@/utils/clinicasHospital'

interface RegistroCadastro {
  id: string
  /** Coluna Setor: tipo de cadastro, ou nome da clínica quando tipo = Clínica */
  setor: string
  responsavel: string
  email: string
  ativo: boolean
  tiposLabel: string
  /** Exclusão de clínica/medicamento/empenhado usa o id da entidade */
  isEntidadeClinica: boolean
}

function isOpcaoClinica(opcao: CadastroPerfilOpcao): boolean {
  return opcao.isClinica === true || opcao.id === 'clinica' || opcao.perfil === 'CLINICA'
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
      const responsavel = user?.nome?.trim() || c.responsavel?.trim() || '—'
      return {
        id: c.id,
        setor: isOpcaoClinica(filtroOpcao) ? c.nome : filtroOpcao.label,
        responsavel,
        email: user?.email?.trim() || '—',
        ativo: user?.ativo ?? false,
        tiposLabel: loginPerfilLabel(perfilEntidade),
        isEntidadeClinica: true,
      }
    })
    .sort((a, b) => a.setor.localeCompare(b.setor, 'pt-BR', { sensitivity: 'base' }))
}

function buildRegistrosSetor(
  opcoes: CadastroPerfilOpcao[],
  usuarios: User[],
): RegistroCadastro[] {
  const perfis = opcoes.map((o) => o.perfil)
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
    const tiposDoUsuario = userPerfis(u).map((p) => loginPerfilLabel(p))
    resultado.push({
      id: u.id,
      setor: tiposDoUsuario.join(', '),
      responsavel: u.nome?.trim() || '—',
      email: u.email?.trim() || '—',
      ativo: u.ativo,
      tiposLabel: tiposDoUsuario.join(', '),
      isEntidadeClinica: false,
    })
  }
  return resultado.sort((a, b) =>
    a.setor.localeCompare(b.setor, 'pt-BR', { sensitivity: 'base' }),
  )
}

export function UsuariosTab() {
  const theme = useTheme()
  /** Inicia vazio — o gestor escolhe o tipo ao abrir a página. */
  const [opcoesSelecionadas, setOpcoesSelecionadas] = useState<CadastroPerfilOpcao[]>([])
  const createUser = useCreatePortalUser()
  const deleteCadastro = useDeleteCadastro()
  const { data: clinicas = [] } = useClinicas()
  const { data: usuarios = [] } = useUsuarios()

  const primaria = opcoesSelecionadas[0] ?? null
  const mostraSelectClinica = opcoesSelecionadas.some(isOpcaoClinica)

  const [nomeResponsavel, setNomeResponsavel] = useState('')
  const [clinicaSelecionada, setClinicaSelecionada] = useState('')
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

    return buildRegistrosSetor(opcoesSelecionadas, usuarios)
  }, [opcoesSelecionadas, clinicas, usuarios])

  const colunas = useMemo<ColumnDef<RegistroCadastro>[]>(
    () => [
      { accessorKey: 'setor', header: 'Setor' },
      {
        accessorKey: 'responsavel',
        header: 'Responsável',
        cell: ({ row }) => row.original.responsavel,
      },
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
              aria-label={`Excluir ${row.original.setor}`}
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

  const handleTiposChange = (_: unknown, next: CadastroPerfilOpcao[]) => {
    if (next.length === 0) {
      setOpcoesSelecionadas([])
      setClinicaSelecionada('')
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
    if (!next.some(isOpcaoClinica)) {
      setClinicaSelecionada('')
    }
  }

  const handleSubmit = async () => {
    setErro('')
    setSucesso('')
    try {
      if (opcoesSelecionadas.length === 0) {
        throw new Error('Selecione ao menos um tipo de cadastro')
      }
      if (mostraSelectClinica && !clinicaSelecionada) {
        throw new Error('Selecione a clínica')
      }
      await createUser.mutateAsync({
        nome: nomeResponsavel,
        email,
        opcoes: opcoesSelecionadas,
        clinicaNome: mostraSelectClinica ? clinicaSelecionada : undefined,
      })
      const labels = opcoesSelecionadas.map((o) => o.label).join(', ')
      setSucesso(
        `Cadastro criado (${labels})! O usuário acessa a Timeline com este e-mail @marinha.mil.br, escolhendo um dos tipos autorizados.`,
      )
      setNomeResponsavel('')
      setClinicaSelecionada('')
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
      setSucesso(`Cadastro "${registroExcluir.setor}" excluído com sucesso.`)
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

  const labelResponsavel =
    opcoesSelecionadas.length === 0
      ? 'Nome do Responsável'
      : opcoesSelecionadas.length === 1
        ? (primaria?.campoNomeLabel ?? 'Nome do Responsável')
        : `Nome do Responsável (${labelsSelecionados})`
  const placeholderResponsavel =
    primaria?.campoNomePlaceholder ?? 'Ex.: Cap. Ana Paula'

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
        <Grid size={{ xs: 12, md: mostraSelectClinica ? 6 : 5 }}>
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
              <Grid size={{ xs: 12, sm: mostraSelectClinica ? 6 : 12 }}>
                <Autocomplete
                  multiple
                  options={CADASTRO_PERFIS}
                  value={opcoesSelecionadas}
                  disableCloseOnSelect
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  onChange={handleTiposChange}
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
              {mostraSelectClinica ? (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel id="cadastro-clinica-select-label">Clínica</InputLabel>
                    <Select
                      labelId="cadastro-clinica-select-label"
                      id="cadastro-clinica-select"
                      label="Clínica"
                      value={clinicaSelecionada}
                      onChange={(e) => setClinicaSelecionada(String(e.target.value))}
                    >
                      {CLINICAS_HOSPITAL.map((nomeClinica) => (
                        <MenuItem key={nomeClinica} value={nomeClinica}>
                          {nomeClinica}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              ) : null}
              <Grid size={12}>
                <TextField
                  fullWidth
                  label={labelResponsavel}
                  value={nomeResponsavel}
                  onChange={(e) => setNomeResponsavel(e.target.value)}
                  placeholder={placeholderResponsavel}
                  disabled={opcoesSelecionadas.length === 0}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  type="email"
                  label="E-mail institucional"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@marinha.mil.br"
                  helperText="Somente @marinha.mil.br — usado em /clinica/timeline"
                  disabled={opcoesSelecionadas.length === 0}
                />
              </Grid>
              <Grid size={12}>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={
                    createUser.isPending ||
                    opcoesSelecionadas.length === 0 ||
                    (mostraSelectClinica && !clinicaSelecionada)
                  }
                >
                  {createUser.isPending ? 'Cadastrando...' : 'Cadastrar usuário'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: mostraSelectClinica ? 6 : 7 }}>
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
            Deseja realmente excluir o cadastro de <strong>{registroExcluir?.setor}</strong>
            {registroExcluir?.responsavel && registroExcluir.responsavel !== '—'
              ? ` (responsável: ${registroExcluir.responsavel})`
              : ''}
            {registroExcluir?.email && registroExcluir.email !== '—'
              ? ` — ${registroExcluir.email}`
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
