import { Box, Button, Paper, Typography, Alert } from '@mui/material'
import ArchiveIcon from '@mui/icons-material/Archive'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ProcessosArquivadosTable } from '@/components/workflow/ProcessosArquivadosTable'
import { useProcessosArquivadosSetor } from '@/hooks/useProcessosArquivados'

export default function FinanceiroArquivadosPage() {
  const { navigatePortal } = usePortalPaths()
  const { data: processos = [], isLoading } = useProcessosArquivadosSetor('DIV_MAT_FINANCAS')

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigatePortal('/financeiro/pagamentos')}
        sx={{ mb: 2 }}
      >
        Voltar aos pagamentos
      </Button>

      <PageHeader
        title="Arquivados"
        subtitle="Processos com pagamento registrado e arquivados pelo Financeiro"
      />

      <Paper sx={{ p: 2, borderRadius: 3 }}>
        {processos.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <ArchiveIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              Nenhum processo arquivado pelo Financeiro ainda.
            </Typography>
          </Box>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Pagamentos registrados são arquivados automaticamente nesta aba.
            </Alert>
            <ProcessosArquivadosTable
              processos={processos}
              emptyMessage="Nenhum processo arquivado."
            />
          </>
        )}
      </Paper>
    </>
  )
}
