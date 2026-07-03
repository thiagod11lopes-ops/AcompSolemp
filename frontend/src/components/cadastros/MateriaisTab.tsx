import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Material } from '@/types'
import { DataTable } from '@/components/common/DataTable'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useMateriais } from '@/hooks/useCadastros'

export function MateriaisTab() {
  const { data = [], isLoading } = useMateriais()

  const columns = useMemo<ColumnDef<Material>[]>(
    () => [
      { accessorKey: 'descricao', header: 'Descrição' },
      { accessorKey: 'fabricante', header: 'Fabricante' },
      { accessorKey: 'unidade', header: 'Unidade' },
    ],
    [],
  )

  if (isLoading) return <LoadingSpinner minHeight={200} />
  return <DataTable data={data} columns={columns} />
}
