import { useMemo, useState } from 'react'
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
import InventoryIcon from '@mui/icons-material/Inventory'
import GavelIcon from '@mui/icons-material/Gavel'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import type { ColumnDef } from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useCreateClinicaUser,
  useCreateOrdenadorUser,
  useCreateFinanceiroUser,
} from '@/hooks/useUsuarioCadastro'
import { useClinicas, useMateriais, useUsuarios } from '@/hooks/useCadastros'
import { cadastroService } from '@/services/cadastroService'
import { DataTable } from '@/components/common/DataTable'
import type { Material, User } from '@/types'

export function UsuariosTab() {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const [subTab, setSubTab] = useState(0)
  const createClinica = useCreateClinicaUser()
  const createOrdenador = useCreateOrdenadorUser()
  const createFinanceiro = useCreateFinanceiroUser()
  const createMaterial = useMutation({
    mutationFn: (input: { descricao: string; fabricante: string; unidade: string }) =>
      cadastroService.saveMaterial({
        id: `material-${Date.now()}`,
        descricao: input.descricao.trim(),
        fabricante: input.fabricante.trim(),
        unidade: input.unidade.trim() || 'UN',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais'] })
    },
  })

  const { data: clinicas = [] } = useClinicas()
  const { data: materiais = [] } = useMateriais()
  const { data: usuarios = [] } = useUsuarios()

  const usuariosClinica = useMemo(
    () => usuarios.filter((u) => u.perfil === 'CLINICA'),
    [usuarios],
  )
  const usuariosOrdenador = useMemo(
    () => usuarios.filter((u) => u.perfil === 'ASSINANTE'),
    [usuarios],
  )
  const usuariosFinanceiro = useMemo(
    () => usuarios.filter((u) => u.perfil === 'FINANCEIRO'),
    [usuarios],
  )

  const clinicasComLogin = useMemo(() => {
    return clinicas.map((c) => {
      const user = usuariosClinica.find((u) => u.clinicaId === c.id)
      return {
        id: c.id,
        nome: c.nome,
        responsavel: c.responsavel,
        login: user?.login ?? '—',
        ativo: user?.ativo ?? false,
      }
    })
  }, [clinicas, usuariosClinica])

  const [nomeClinica, setNomeClinica] = useState('')
  const [senhaClinica, setSenhaClinica] = useState('')
  const [descricaoMaterial, setDescricaoMaterial] = useState('')
  const [fabricanteMaterial, setFabricanteMaterial] = useState('')
  const [unidadeMaterial, setUnidadeMaterial] = useState('UN')
  const [nomeOrdenador, setNomeOrdenador] = useState('')
  const [senhaOrdenador, setSenhaOrdenador] = useState('')
  const [nomeFinanceiro, setNomeFinanceiro] = useState('')
  const [senhaFinanceiro, setSenhaFinanceiro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  const colunasClinica = useMemo<ColumnDef<(typeof clinicasComLogin)[0]>[]>(
    () => [
      { accessorKey: 'nome', header: 'Nome' },
      { accessorKey: 'login', header: 'Login' },
      {
        accessorKey: 'ativo',
        header: 'Status',
        cell: ({ getValue }) => (getValue<boolean>() ? 'Ativo' : '—'),
      },
    ],
    [],
  )

  const colunasMaterial = useMemo<ColumnDef<Material>[]>(
    () => [
      { accessorKey: 'descricao', header: 'Descrição' },
      { accessorKey: 'fabricante', header: 'Fabricante' },
      { accessorKey: 'unidade', header: 'Unidade' },
    ],
    [],
  )

  const colunasUsuario = useMemo<ColumnDef<User>[]>(
    () => [
      { accessorKey: 'nome', header: 'Nome' },
      { accessorKey: 'login', header: 'Login' },
      {
        accessorKey: 'ativo',
        header: 'Status',
        cell: ({ getValue }) => (getValue<boolean>() ? 'Ativo' : 'Inativo'),
      },
    ],
    [],
  )

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

  const handleCreateMaterial = async () => {
    setErro('')
    setSucesso('')
    try {
      if (descricaoMaterial.trim().length < 2) {
        throw new Error('Informe a descrição do material')
      }
      const material = await createMaterial.mutateAsync({
        descricao: descricaoMaterial,
        fabricante: fabricanteMaterial,
        unidade: unidadeMaterial,
      })
      setSucesso(`Material cadastrado: ${material.descricao}.`)
      setDescricaoMaterial('')
      setFabricanteMaterial('')
      setUnidadeMaterial('UN')
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

  const formPaperSx = (color: string) => ({
    p: 3,
    borderRadius: 3,
    height: '100%',
    background: `linear-gradient(145deg, ${alpha(color, 0.08)} 0%, ${theme.palette.background.paper} 50%)`,
  })

  const renderTabela = () => {
    if (subTab === 0) {
      return (
        <DataTable
          data={clinicasComLogin}
          columns={colunasClinica}
          emptyMessage="Nenhuma clínica cadastrada ainda."
        />
      )
    }
    if (subTab === 1) {
      return (
        <DataTable
          data={materiais}
          columns={colunasMaterial}
          emptyMessage="Nenhum material cadastrado ainda."
        />
      )
    }
    if (subTab === 2) {
      return (
        <DataTable
          data={usuariosOrdenador}
          columns={colunasUsuario}
          emptyMessage="Nenhum ordenador cadastrado ainda."
        />
      )
    }
    return (
      <DataTable
        data={usuariosFinanceiro}
        columns={colunasUsuario}
        emptyMessage="Nenhum usuário financeiro cadastrado ainda."
      />
    )
  }

  const tituloTabela =
    subTab === 0
      ? 'Clínicas cadastradas'
      : subTab === 1
        ? 'Materiais cadastrados'
        : subTab === 2
          ? 'Ordenadores cadastrados'
          : 'Financeiros cadastrados'

  return (
    <Box>
      <Tabs
        value={subTab}
        onChange={(_, v) => {
          setSubTab(v)
          setErro('')
          setSucesso('')
        }}
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab icon={<LocalHospitalIcon />} iconPosition="start" label="Cadastrar Clínica" />
        <Tab icon={<InventoryIcon />} iconPosition="start" label="Material" />
        <Tab icon={<GavelIcon />} iconPosition="start" label="Ordenador de Despesa" />
        <Tab icon={<AccountBalanceIcon />} iconPosition="start" label="Financeiro" />
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

      <Grid container spacing={3} alignItems="stretch">
        <Grid size={{ xs: 12, md: 5 }}>
          {subTab === 0 && (
            <Paper sx={formPaperSx(theme.palette.primary.main)}>
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
            <Paper sx={formPaperSx(theme.palette.info.main)}>
              <Typography variant="h6" gutterBottom>
                Material
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Cadastre o material consignado para uso nos lançamentos das clínicas.
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Descrição"
                    value={descricaoMaterial}
                    onChange={(e) => setDescricaoMaterial(e.target.value)}
                    placeholder="Ex.: Placa bloqueada 4,5mm"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Fabricante"
                    value={fabricanteMaterial}
                    onChange={(e) => setFabricanteMaterial(e.target.value)}
                    placeholder="Ex.: OrthoMed"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Unidade"
                    value={unidadeMaterial}
                    onChange={(e) => setUnidadeMaterial(e.target.value)}
                    placeholder="Ex.: UN"
                    helperText="Ex.: UN, CX, KIT"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Button
                    variant="contained"
                    color="info"
                    onClick={handleCreateMaterial}
                    disabled={createMaterial.isPending}
                  >
                    {createMaterial.isPending ? 'Cadastrando...' : 'Cadastrar material'}
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          )}

          {subTab === 2 && (
            <Paper sx={formPaperSx(theme.palette.warning.main)}>
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

          {subTab === 3 && (
            <Paper sx={formPaperSx(theme.palette.success.main)}>
              <Typography variant="h6" gutterBottom>
                Financeiro
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Cadastre o nome do usuário financeiro e uma senha. Ele receberá notificações de
                pagamento pendente e poderá confirmar o pagamento da nota fiscal selecionando a
                SOLEMP.
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
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, px: 1 }}>
              {tituloTabela}
            </Typography>
            {renderTabela()}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
