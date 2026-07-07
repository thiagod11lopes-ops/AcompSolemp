import { useMemo } from 'react'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
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
import { formatDate, formatNip } from '@/utils/format'

export default function ClinicaPedidosPage() {
  const { navigatePortal } = usePortalPaths()
  const { user } = useClinicaAuth()
  const { data: clinicas = [] } = useClinicas()
  const { data: pedidos = [], isLoading } = useClinicaPedidos()

  const clinica = clinicas.find((c) => c.id === user?.clinicaId)

  const columns = useMemo<ColumnDef<PedidoComDetalhes>[]>(
    () => [
      { accessorKey: 'numero', header: 'Número' },
      {
        id: 'paciente',
        header: 'Paciente',
        cell: ({ row }) => row.original.paciente?.nome ?? '—',
      },
      {
        id: 'nip',
        header: 'NIP',
        cell: ({ row }) =>
          row.original.paciente?.nip ? formatNip(row.original.paciente.nip) : '—',
      },
      {
        id: 'vinculo',
        header: 'Vínculo',
        cell: ({ row }) => {
          const vinculo = row.original.paciente?.vinculo
          if (vinculo === 'TITULAR') return 'Titular'
          if (vinculo === 'DEPENDENTE') return 'Dependente'
          return '—'
        },
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
              onClick={() => navigatePortal(`/clinica/timeline/${row.original.id}`)}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [navigatePortal],
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
            onClick={() => navigatePortal('/clinica/pedidos/novo')}
          >
            Novo Lançamento
          </Button>
        }
      />
      <DataTable
        data={pedidos}
        columns={columns}
        emptyMessage="Nenhum lançamento cadastrado. Clique em Novo Lançamento para iniciar."
      />
    </>
  )
}
