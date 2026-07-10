import { Box, Typography } from '@mui/material'
import { PageHeader } from '@/components/common/PageHeader'
import { MedicamentosPrecosSpreadsheet } from '@/components/clinica/MedicamentosPrecosSpreadsheet'
import { usePortalPaths } from '@/contexts/DemoRouteContext'

export default function ClinicaPrecosMedicamentosPage() {
  const { isDemo } = usePortalPaths()

  return (
    <Box>
      <PageHeader
        title="Preço de Medicamentos"
        subtitle={
          isDemo
            ? 'Lista fixa de demonstração com preços de referência 2026'
            : 'Lista de medicamentos com preços de referência 2026'
        }
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {isDemo
          ? 'Conteúdo de demonstração somente leitura — use esta lista no lançamento manual e no Modelo IHM PME.'
          : 'Planilha de consulta com NEB, medicamento, unidade de fornecimento e preço de referência.'}
      </Typography>
      <MedicamentosPrecosSpreadsheet conteudoFixoDemo={isDemo} />
    </Box>
  )
}
