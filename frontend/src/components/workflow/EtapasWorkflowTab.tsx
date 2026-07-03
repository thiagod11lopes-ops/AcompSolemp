import { useMemo } from 'react'
import { Chip } from '@mui/material'
import type { ColumnDef } from '@tanstack/react-table'
import type { WorkflowEtapa } from '@/types'
import { DataTable } from '@/components/common/DataTable'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { getRoleLabel } from '@/mocks/seed'

export function EtapasWorkflowTab() {
  const { data = [], isLoading } = useWorkflowEtapas()

  const columns = useMemo<ColumnDef<WorkflowEtapa>[]>(
    () => [
      { accessorKey: 'ordem', header: 'Ordem' },
      { accessorKey: 'nome', header: 'Etapa' },
      { accessorKey: 'chave', header: 'Chave' },
      { accessorKey: 'prazoDias', header: 'Prazo (dias)' },
      {
        accessorKey: 'perfilResponsavel',
        header: 'Responsável',
        cell: ({ getValue }) => getRoleLabel(getValue<WorkflowEtapa['perfilResponsavel']>()),
      },
      {
        accessorKey: 'ativo',
        header: 'Status',
        cell: ({ getValue }) => (
          <Chip
            label={getValue<boolean>() ? 'Ativa' : 'Inativa'}
            color={getValue<boolean>() ? 'success' : 'default'}
            size="small"
          />
        ),
      },
    ],
    [],
  )

  if (isLoading) return <LoadingSpinner minHeight={200} />
  return <DataTable data={data} columns={columns} />
}
