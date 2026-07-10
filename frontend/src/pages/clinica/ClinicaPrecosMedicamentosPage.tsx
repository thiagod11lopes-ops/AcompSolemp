import { Box, Typography } from '@mui/material'
import { PageHeader } from '@/components/common/PageHeader'
import { MedicamentosPrecosSpreadsheet } from '@/components/clinica/MedicamentosPrecosSpreadsheet'

export default function ClinicaPrecosMedicamentosPage() {
  return (
    <Box>
      <PageHeader
        title="Preço de Medicamentos"
        subtitle="Lista editável de medicamentos com preços de referência 2026"
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Edite NEB, medicamento, UF e preço de referência. As alterações são salvas automaticamente e
        alimentam o select do lançamento manual.
      </Typography>
      <MedicamentosPrecosSpreadsheet />
    </Box>
  )
}
