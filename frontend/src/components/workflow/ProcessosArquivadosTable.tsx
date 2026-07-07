import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Tooltip,
  Typography,
} from '@mui/material'
import DescriptionIcon from '@mui/icons-material/Description'
import type { ColumnDef } from '@tanstack/react-table'
import type { ProcessoArquivado } from '@/types'
import { DataTable } from '@/components/common/DataTable'
import { AuditoriaPlanilhaModal } from '@/components/ordenador/AuditoriaPlanilhaModal'
import { pedidoPlanilhaEnvioService } from '@/services/pedidoPlanilhaEnvioService'
import { formatCurrency, formatDateTime } from '@/utils/format'

interface ProcessosArquivadosTableProps {
  processos: ProcessoArquivado[]
  emptyMessage?: string
  showSetor?: boolean
}

export function ProcessosArquivadosTable({
  processos,
  emptyMessage = 'Nenhum processo arquivado ainda.',
  showSetor = false,
}: ProcessosArquivadosTableProps) {
  const [planilhaOpen, setPlanilhaOpen] = useState(false)
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoArquivado | null>(null)

  const planilhaSelecionada = processoSelecionado
    ? pedidoPlanilhaEnvioService.getForPedido(processoSelecionado.pedidoId)
    : null

  const podeAbrirPlanilha = (processo: ProcessoArquivado) =>
    processo.etapaChave === 'DIV_MAT_AUDITORIA' ||
    processo.etapaChave === 'DIV_MAT_CONTABILIDADE_IMH'

  const colunas = useMemo<ColumnDef<ProcessoArquivado>[]>(() => {
    const base: ColumnDef<ProcessoArquivado>[] = [
      {
        accessorKey: 'arquivoNome',
        header: 'Arquivo',
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <DescriptionIcon fontSize="small" color="action" />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {row.original.arquivoNome}
            </Typography>
          </Box>
        ),
      },
      { accessorKey: 'pedidoNumero', header: 'Processo' },
      { accessorKey: 'clinicaNome', header: 'Clínica' },
    ]

    if (showSetor) {
      base.push({ accessorKey: 'etapaNome', header: 'Setor' })
    }

    base.push(
      {
        accessorKey: 'valor',
        header: 'Valor',
        cell: ({ getValue }) => formatCurrency(getValue<number>()),
      },
      {
        accessorKey: 'concluidoEm',
        header: 'Arquivado em',
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
      {
        accessorKey: 'concluidoPorNome',
        header: 'Por',
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) =>
          podeAbrirPlanilha(row.original) ? (
            <Tooltip title="Abrir planilha arquivada">
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setProcessoSelecionado(row.original)
                  setPlanilhaOpen(true)
                }}
              >
                Ver planilha
              </Button>
            </Tooltip>
          ) : (
            <Chip label={row.original.arquivoNome} size="small" variant="outlined" />
          ),
      },
    )

    return base
  }, [showSetor])

  return (
    <>
      <DataTable data={processos} columns={colunas} emptyMessage={emptyMessage} />

      <AuditoriaPlanilhaModal
        open={planilhaOpen}
        pedidoNumero={processoSelecionado?.pedidoNumero ?? ''}
        planilha={planilhaSelecionada}
        title={
          processoSelecionado
            ? `${processoSelecionado.arquivoNome} — ${processoSelecionado.pedidoNumero}`
            : undefined
        }
        onClose={() => {
          setPlanilhaOpen(false)
          setProcessoSelecionado(null)
        }}
      />
    </>
  )
}
