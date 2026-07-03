import { Chip } from '@mui/material'

interface SolempEtapaBadgeProps {
  etapaChave: string
  numero?: string | null
  notaFiscalNumero?: string | null
}

export function SolempEtapaBadge({ etapaChave, numero, notaFiscalNumero }: SolempEtapaBadgeProps) {
  if (etapaChave === 'SOLEMP_CRIADA' && numero) {
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

  if (etapaChave === 'NF_ANEXADA' && notaFiscalNumero) {
    return (
      <Chip
        label={notaFiscalNumero}
        size="small"
        color="success"
        variant="outlined"
        sx={{ fontWeight: 700, letterSpacing: 0.3 }}
      />
    )
  }

  return null
}
