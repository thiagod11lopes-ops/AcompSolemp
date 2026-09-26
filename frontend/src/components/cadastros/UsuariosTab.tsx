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
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
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
import { userPerfis } from '@/utils/userPerfis'
import { loginPerfilLabel } from '@/utils/loginPerfis'
import { CLINICAS_HOSPITAL } from '@/utils/clinicasHospital'

interface RegistroCadastro {
  id: string
  /** Coluna Setor: tipo de cadastro, ou nome da clínica quando tipo = Clínica */
  setor: string
  responsavel: string
  email: string
  ativo: boolean
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

function labelTipoEntidade(tipo: Clinica['tipo']): string {
  if (tipo === 'medicamento') return 'Medicamento'
  if (tipo === 'empenhado') return 'Empenhado'
  return 'Clínica'
}

/** Lista completa de cadastros ativos (não depende do tipo selecionado no formulário). */
function buildTodosRegistros(clinicas: Clinica[], usuarios: User[]): RegistroCadastro[] {
  const resultado: RegistroCadastro[] = []
  const clinicasJaListadas = new Set<string>()

  const usuariosAtivos = usuarios.filter(
    (u) => u.ativo && !isDemoExampleUser(u) && u.perfil !== 'GESTOR' && u.perfil !== 'ADMINISTRADOR',
  )

  for (const clinica of clinicas) {
    if (
      clinica.id === DEMO_CLINICA_EXEMPLO_ID ||
      clinica.id === DEMO_MEDICAMENTO_EXEMPLO_ID ||
      clinica.id === DEMO_EMPENHADO_EXEMPLO_ID
    ) {
      continue
    }
    const usersDaClinica = usuariosAtivos.filter((u) => u.clinicaId === clinica.id)
    if (usersDaClinica.length === 0) continue

    const user =
      usersDaClinica.find((u) => u.email?.trim()) ?? usersDaClinica[0]!
    const tipo = clinica.tipo ?? 'clinica'
    const tipoLabel = labelTipoEntidade(tipo)
    clinicasJaListadas.add(clinica.id)
    resultado.push({
      id: clinica.id,
      setor: tipo === 'clinica' ? clinica.nome : tipoLabel,
      responsavel: user.nome?.trim() || clinica.responsavel?.trim() || '—',
      email: user.email?.trim() || '—',
      ativo: true,
      isEntidadeClinica: true,
    })
  }

  for (const u of usuariosAtivos) {
    if (u.clinicaId) {
      // Já listado pela entidade clínica/medicamento/empenhado
      if (clinicasJaListadas.has(u.clinicaId)) continue
      const tiposDoUsuario = userPerfis(u).map((p) => loginPerfilLabel(p))
      clinicasJaListadas.add(u.clinicaId)
      resultado.push({
        id: u.clinicaId,
        setor: tiposDoUsuario.join(', ') || '—',
        responsavel: u.nome?.trim() || '—',
        email: u.email?.trim() || '—',
        ativo: true,
        isEntidadeClinica: true,
      })
      continue
    }
    const tiposDoUsuario = userPerfis(u).map((p) => loginPerfilLabel(p))
    resultado.push({
      id: u.id,
      setor: tiposDoUsuario.join(', ') || '—',
      responsavel: u.nome?.trim() || '—',
      email: u.email?.trim() || '—',
      ativo: true,
      isEntidadeClinica: false,
    })
  }

  return resultado.sort((a, b) =>
    a.setor.localeCompare(b.setor, 'pt-BR', { sensitivity: 'base' }),
  )
}

export function UsuariosTab() {
  /** Inicia vazio — o gestor escolhe o tipo ao abrir o modal. */
  const [opcoesSelecionadas, setOpcoesSelecionadas] = useState<CadastroPerfilOpcao[]>([])
  const createUser = useCreatePortalUser()
  const deleteCadastro = useDeleteCadastro()
  const { data: clinicas = [] } = useClinicas()
  const { data: usuarios = [] } = useUsuarios()

  const primaria = opcoesSelecionadas[0] ?? null
  const mostraSelectClinica = opcoesSelecionadas.some(isOpcaoClinica)

  const [modalAberto, setModalAberto] = useState(false)
  const [nomeResponsavel, setNomeResponsavel] = useState('')
  const [clinicaSelecionada, setClinicaSelecionada] = useState('')
  const [email, setEmail] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')
  const [erroModal, setErroModal] = useState('')
  const [registroExcluir, setRegistroExcluir] = useState<RegistroCadastro | null>(null)

  const registros = useMemo<RegistroCadastro[]>(
    () => buildTodosRegistros(clinicas, usuarios),
    [clinicas, usuarios],
  )

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
        header: 'E-mail',
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

  const resetFormulario = () => {
    setOpcoesSelecionadas([])
    setNomeResponsavel('')
    setClinicaSelecionada('')
    setEmail('')
    setErroModal('')
  }

  const abrirModal = () => {
    resetFormulario()
    setErro('')
    setSucesso('')
    setModalAberto(true)
  }

  const fecharModal = () => {
    if (createUser.isPending) return
    setModalAberto(false)
    resetFormulario()
  }

  const handleTiposChange = (_: unknown, next: CadastroPerfilOpcao[]) => {
    if (next.length === 0) {
      setOpcoesSelecionadas([])
      setClinicaSelecionada('')
      setErroModal('')
      return
    }
    const last = next[next.length - 1]!
    const prev = next.slice(0, -1)
    if (!podeCombinarOpcoes(prev, last)) {
      setErroModal(
        isCadastroEntidadeClinica(last)
          ? 'Clínica e Medicamento não podem ser combinados com setores nem entre si.'
          : 'Não é possível misturar tipos de clínica com setores da Div. de Material.',
      )
      return
    }
    setErroModal('')
    setOpcoesSelecionadas(next)
    if (!next.some(isOpcaoClinica)) {
      setClinicaSelecionada('')
    }
  }

  const handleSubmit = async () => {
    setErroModal('')
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
      setErro('')
      setModalAberto(false)
      resetFormulario()
    } catch (e) {
      setErroModal(e instanceof Error ? e.message : 'Erro ao cadastrar')
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
  const tituloLista = 'Cadastrado(s)'
  const emptyMessage = 'Nenhum cadastro efetuado ainda.'

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

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={abrirModal}>
          Novo cadastro
        </Button>
      </Box>

      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, px: 1 }}>
          {tituloLista}
        </Typography>
        <DataTable data={registros} columns={colunas} emptyMessage={emptyMessage} />
      </Paper>

      <Dialog
        open={modalAberto}
        onClose={fecharModal}
        fullWidth
        maxWidth="sm"
        aria-labelledby="novo-cadastro-dialog-title"
      >
        <DialogTitle id="novo-cadastro-dialog-title">Novo cadastro</DialogTitle>
        <DialogContent dividers>
          {erroModal && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {erroModal}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ pt: 0.5 }}>
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
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={fecharModal} disabled={createUser.isPending}>
            Cancelar
          </Button>
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
        </DialogActions>
      </Dialog>

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
