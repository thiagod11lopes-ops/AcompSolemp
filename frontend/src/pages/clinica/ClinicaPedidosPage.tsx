import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, IconButton, Tooltip } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import VisibilityIcon from '@mui/icons-material/Visibility'
import type { ColumnDef } from '@tanstack/react-table'
import type { PedidoComDetalhes } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { StatusChip } from '@/components/common/StatusChip'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useClinicaPedidos } from '@/hooks/useClinicaPedidos'
import { useClinicas } from '@/hooks/useCadastros'
import { useClinicaAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/utils/format'

export default function ClinicaPedidosPage() {
  const navigate = useNavigate()
  const { user } = useClinicaAuth()
  const { data: clinicas = [] } = useClinicas()
  const { data: pedidos = [], isLoading } = useClinicaPedidos()

  const clinica = clinicas.find((c) => c.id === user?.clinicaId)

  const columns = useMemo<ColumnDef<PedidoComDetalhes>[]>(
    () => [
      { accessorKey: 'numero', header: 'Número' },
      { accessorKey: 'empresa.nomeFantasia', header: 'Empresa' },
      { accessorKey: 'material.descricao', header: 'Material' },
      {
        accessorKey: 'valor',
        header: 'Valor',
        cell: ({ getValue }) => formatCurrency(getValue<number>()),
      },
      { accessorKey: 'etapaAtual.nome', header: 'Etapa Atual' },
      { accessorKey: 'diasNaEtapa', header: 'Dias na Etapa' },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusChip status={row.original.prazoStatus} concluido={row.original.concluido} />
        ),
      },
      {
        accessorKey: 'dataSolicitacao',
        header: 'Solicitação',
        cell: ({ getValue }) => formatDate(getValue<string>()),
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => (
          <Tooltip title="Ver trajetória">
            <IconButton
              size="small"
              onClick={() => navigate(`/clinica/timeline/${row.original.id}`)}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [navigate],
  )

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title="Meus Pedidos"
        subtitle={`${clinica?.nome ?? 'Sua clínica'} — acompanhe a trajetória dos seus materiais consignados`}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/clinica/pedidos/novo')}
          >
            Novo Pedido
          </Button>
        }
      />
      <DataTable
        data={pedidos}
        columns={columns}
        emptyMessage="Nenhum pedido cadastrado. Clique em Novo Pedido para solicitar material."
      />
    </>
  )
}
