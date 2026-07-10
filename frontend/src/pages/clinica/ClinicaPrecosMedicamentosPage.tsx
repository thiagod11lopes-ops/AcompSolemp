import { Box, Typography } from '@mui/material'
import { PageHeader } from '@/components/common/PageHeader'
import { MedicamentosPrecosSpreadsheet } from '@/components/clinica/MedicamentosPrecosSpreadsheet'

export default function ClinicaPrecosMedicamentosPage() {
  return (
    <Box>
      <PageHeader
        title="Preço de Medicamentos"
        subtitle="Lista de medicamentos com preços de referência 2026"
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Planilha de consulta com NEB, medicamento, unidade de fornecimento e preço de referência.
      </Typography>
      <MedicamentosPrecosSpreadsheet />
    </Box>
  )
}
