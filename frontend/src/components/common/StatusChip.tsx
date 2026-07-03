import { Chip } from '@mui/material'
import type { PrazoStatus } from '@/types'
import { getPrazoStatusColor, getPrazoStatusLabel } from '@/utils/workflow'

interface StatusChipProps {
  status: PrazoStatus
  concluido?: boolean
}

export function StatusChip({ status, concluido }: StatusChipProps) {
  if (concluido) {
    return <Chip label="Concluído" color="info" size="small" variant="outlined" />
  }

  return (
    <Chip
      label={getPrazoStatusLabel(status)}
      color={getPrazoStatusColor(status)}
      size="small"
    />
  )
}
