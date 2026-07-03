import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Empresa } from '@/types'
import { DataTable } from '@/components/common/DataTable'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useEmpresas } from '@/hooks/useCadastros'
import { formatCnpj, formatPhone } from '@/utils/format'

export function EmpresasTab() {
  const { data = [], isLoading } = useEmpresas()

  const columns = useMemo<ColumnDef<Empresa>[]>(
    () => [
      { accessorKey: 'nomeFantasia', header: 'Nome Fantasia' },
      { accessorKey: 'razaoSocial', header: 'Razão Social' },
      {
        accessorKey: 'cnpj',
        header: 'CNPJ',
        cell: ({ getValue }) => formatCnpj(getValue<string>()),
      },
      { accessorKey: 'contato', header: 'Contato' },
      {
        accessorKey: 'telefone',
        header: 'Telefone',
        cell: ({ getValue }) => formatPhone(getValue<string>()),
      },
      { accessorKey: 'email', header: 'E-mail' },
    ],
    [],
  )

  if (isLoading) return <LoadingSpinner minHeight={200} />
  return <DataTable data={data} columns={columns} />
}
