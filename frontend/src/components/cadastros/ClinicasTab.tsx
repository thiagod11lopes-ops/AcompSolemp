import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Clinica } from '@/types'
import { DataTable } from '@/components/common/DataTable'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useClinicas } from '@/hooks/useCadastros'
import { formatPhone } from '@/utils/format'

export function ClinicasTab() {
  const { data = [], isLoading } = useClinicas()

  const columns = useMemo<ColumnDef<Clinica>[]>(
    () => [
      { accessorKey: 'nome', header: 'Nome' },
      { accessorKey: 'responsavel', header: 'Responsável' },
      {
        accessorKey: 'telefone',
        header: 'Telefone',
        cell: ({ getValue }) => formatPhone(getValue<string>()),
      },
    ],
    [],
  )

  if (isLoading) return <LoadingSpinner minHeight={200} />
  return <DataTable data={data} columns={columns} />
}
