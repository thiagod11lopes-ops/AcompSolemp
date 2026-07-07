import { useMemo, useState } from 'react'
import { IconButton, Tooltip } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import type { ColumnDef } from '@tanstack/react-table'
import type { PedidoComDetalhes, PedidoFilters } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { StatusChip } from '@/components/common/StatusChip'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ProcessFilters } from '@/components/workflow/ProcessFilters'
import { usePedidos } from '@/hooks/usePedidos'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { formatCurrency, formatDate } from '@/utils/format'

export default function ProcessosPage() {
  const { navigatePortal } = usePortalPaths()
  const [filters, setFilters] = useState<PedidoFilters>({})
  const { data: pedidos = [], isLoading } = usePedidos(filters)

  const columns = useMemo<ColumnDef<PedidoComDetalhes>[]>(
    () => [
      { accessorKey: 'numero', header: 'Número' },
      { accessorKey: 'clinica.nome', header: 'Clínica' },
      { accessorKey: 'empresa.nomeFantasia', header: 'Empresa' },
      { accessorKey: 'material.descricao', header: 'Material' },
      {
        accessorKey: 'valor',
        header: 'Valor',
        cell: ({ getValue }) => formatCurrency(getValue<number>()),
      },
      { accessorKey: 'etapaAtual.nome', header: 'Etapa Atual' },
      {
        id: 'responsavel',
        header: 'Responsável',
        cell: ({ row }) => row.original.responsavelAtual?.nome ?? '—',
      },
      { accessorKey: 'diasNaEtapa', header: 'Dias na Etapa' },
      {
        id: 'prazo',
        header: 'Prazo',
        cell: ({ row }) => `${row.original.etapaAtual.prazoDias} dias`,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusChip status={row.original.prazoStatus} concluido={row.original.concluido} />
        ),
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => (
          <Tooltip title="Ver detalhes">
            <IconButton
              size="small"
              onClick={() => navigatePortal(`/gestor/processos/${row.original.id}`)}
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
        title="Processos"
        subtitle={`${pedidos.length} processo(s) encontrado(s) · Solicitações de ${formatDate(new Date().toISOString())}`}
      />
      <ProcessFilters filters={filters} onChange={setFilters} />
      <DataTable data={pedidos} columns={columns} />
    </>
  )
}
