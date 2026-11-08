import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  Stack,
  Typography,
} from '@mui/material'

interface SistemaForaDoArModalProps {
  open: boolean
  checking?: boolean
  onRetry?: () => void
}

/**
 * Bloqueio total sem modo offline.
 * Frase fixa exigida: "Sistema fora do ar, sem rede local"
 */
export function SistemaForaDoArModal({
  open,
  checking = false,
  onRetry,
}: SistemaForaDoArModalProps) {
  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      onClose={() => undefined}
      fullWidth
      maxWidth="xs"
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: 'rgba(12, 12, 13, 0.55)',
            backdropFilter: 'blur(8px)',
          },
        },
        paper: {
          sx: {
            borderRadius: '18px',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
          },
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          pt: 3.5,
          pb: 3,
          textAlign: 'center',
          background:
            'linear-gradient(180deg, rgba(85,139,113,0.08) 0%, transparent 55%)',
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            mx: 'auto',
            mb: 2,
            borderRadius: '18px',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(198, 40, 40, 0.08)',
            color: 'error.main',
          }}
        >
          <CloudOffRoundedIcon sx={{ fontSize: 34 }} />
        </Box>

        <Typography
          variant="h6"
          sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1 }}
        >
          Sistema fora do ar, sem rede local
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Conecte-se à rede da empresa e aguarde o servidor voltar. Este sistema
          não funciona sem a rede local.
        </Typography>

        <Stack spacing={1.25} alignItems="center">
          {checking ? (
            <CircularProgress size={22} thickness={4} />
          ) : (
            <Button
              variant="contained"
              startIcon={<RefreshRoundedIcon />}
              onClick={onRetry}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '12px',
                px: 2.5,
                boxShadow: '0 6px 14px rgba(63, 107, 86, 0.22)',
                background: 'linear-gradient(135deg, #558b71 0%, #3f6b56 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #61987d 0%, #4a7a63 100%)',
                },
              }}
            >
              Tentar novamente
            </Button>
          )}
        </Stack>
      </Box>
    </Dialog>
  )
}
