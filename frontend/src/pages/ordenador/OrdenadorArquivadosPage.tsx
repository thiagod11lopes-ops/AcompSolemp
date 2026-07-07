import { Box, Button, Paper, Typography, Alert } from '@mui/material'
import ArchiveIcon from '@mui/icons-material/Archive'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ProcessosArquivadosTable } from '@/components/workflow/ProcessosArquivadosTable'
import { useProcessosArquivadosSetor } from '@/hooks/useProcessosArquivados'
import { useOrdenadorAuth } from '@/contexts/AuthContext'
import { PERFIL_PARA_CHAVE_ETAPA } from '@/utils/perfilEtapa'
import { getRoleLabel } from '@/mocks/seed'

export default function OrdenadorArquivadosPage() {
  const navigate = useNavigate()
  const { user } = useOrdenadorAuth()
  const etapaChave = user ? PERFIL_PARA_CHAVE_ETAPA[user.perfil] : null
  const perfilLabel = user ? getRoleLabel(user.perfil) : 'Setor'
  const { data: processos = [], isLoading } = useProcessosArquivadosSetor(etapaChave)

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/ordenador/timelines')}
        sx={{ mb: 2 }}
      >
        Voltar às timelines
      </Button>

      <PageHeader
        title="Arquivados"
        subtitle={`Processos concluídos ou encaminhados por ${perfilLabel}`}
      />

      <Paper sx={{ p: 2, borderRadius: 3 }}>
        {processos.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <ArchiveIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              Nenhum processo arquivado neste setor ainda.
            </Typography>
          </Box>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Documentos arquivados ao finalizar ou encaminhar processos para a próxima fase.
            </Alert>
            <ProcessosArquivadosTable
              processos={processos}
              emptyMessage="Nenhum processo arquivado neste setor."
            />
          </>
        )}
      </Paper>
    </>
  )
}
