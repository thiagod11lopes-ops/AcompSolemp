import { Button } from '@mui/material'
import UndoIcon from '@mui/icons-material/Undo'

interface DevolverPlanilhaButtonProps {
  onClick: () => void
  disabled?: boolean
  color?: 'inherit' | 'primary'
  variant?: 'outlined' | 'contained' | 'text'
}

export function DevolverPlanilhaButton({
  onClick,
  disabled = false,
  color = 'inherit',
  variant = 'outlined',
}: DevolverPlanilhaButtonProps) {
  return (
    <Button
      color={color}
      variant={variant}
      size="small"
      startIcon={<UndoIcon sx={{ fontSize: 18 }} />}
      onClick={onClick}
      disabled={disabled}
      sx={{
        textTransform: 'none',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      Devolver planilha
    </Button>
  )
}
