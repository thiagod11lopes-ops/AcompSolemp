import { Chip } from '@mui/material'

interface SolempEtapaBadgeProps {
  etapaChave: string
  numero?: string | null
  notaFiscalNumero?: string | null
}

export function SolempEtapaBadge({ etapaChave, numero }: SolempEtapaBadgeProps) {
  if (
    (etapaChave === 'DIV_MAT_ASSINATURA_1' || etapaChave === 'DIV_MAT_ASSINATURA_2') &&
    numero
  ) {
    return (
      <Chip
        label={numero}
        size="small"
        color="primary"
        variant="outlined"
        sx={{ fontWeight: 700, letterSpacing: 0.5 }}
      />
    )
  }

  return null
}
