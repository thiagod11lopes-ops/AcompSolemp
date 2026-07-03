import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { HistoricoEvento } from '@/types'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useHistorico } from '@/hooks/useCadastros'
import { usePedidos } from '@/hooks/usePedidos'
import { formatDateTime } from '@/utils/format'

export default function HistoricoPage() {
  const { data: historico = [], isLoading } = useHistorico()
  const { data: pedidos = [] } = usePedidos()

  const columns = useMemo<ColumnDef<HistoricoEvento>[]>(
    () => [
      {
        id: 'pedido',
        header: 'Processo',
        cell: ({ row }) => {
          const pedido = pedidos.find((p) => p.id === row.original.pedidoId)
          return pedido?.numero ?? row.original.pedidoId
        },
      },
      { accessorKey: 'etapaNome', header: 'Etapa' },
      { accessorKey: 'usuarioNome', header: 'Usuário' },
      {
        accessorKey: 'data',
        header: 'Data',
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
      { accessorKey: 'observacao', header: 'Observação' },
    ],
    [pedidos],
  )

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title="Histórico"
        subtitle="Registro imutável de todos os eventos do sistema — nenhuma informação é apagada"
      />
      <DataTable data={historico} columns={columns} />
    </>
  )
}
