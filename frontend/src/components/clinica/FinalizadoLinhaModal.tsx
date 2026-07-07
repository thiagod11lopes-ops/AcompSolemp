import {
  Box,
  Button,
  Dialog,
  IconButton,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import UndoIcon from '@mui/icons-material/Undo'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import { formatValorBrasileiro } from '@/utils/consumoMaterialOds'

interface FinalizadoLinhaModalProps {
  open: boolean
  row: ConsumoMaterialRow | null
  canDesmarcar?: boolean
  onClose: () => void
  onDesmarcar: () => void
}

export function FinalizadoLinhaModal({
  open,
  row,
  canDesmarcar = true,
  onClose,
  onDesmarcar,
}: FinalizadoLinhaModalProps) {
  const theme = useTheme()
  const success = theme.palette.success.main
  const primary = theme.palette.primary.main

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(10px)',
            bgcolor: alpha(theme.palette.common.black, 0.45),
          },
        },
        paper: {
          elevation: 0,
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(theme.palette.background.default, 0.98)} 100%)`,
            border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            boxShadow: `0 24px 80px ${alpha(theme.palette.common.black, 0.28)}, 0 0 0 1px ${alpha(primary, 0.06)} inset`,
          },
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          px: 3,
          pt: 3,
          pb: 2.5,
          background: `linear-gradient(135deg, ${alpha(success, 0.14)} 0%, ${alpha(primary, 0.08)} 55%, transparent 100%)`,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -20,
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(success, 0.22)} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <IconButton
          onClick={onClose}
          aria-label="Fechar"
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            bgcolor: alpha(theme.palette.common.black, 0.04),
            '&:hover': { bgcolor: alpha(theme.palette.common.black, 0.08) },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, pr: 4 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              color: success,
              bgcolor: alpha(success, 0.12),
              boxShadow: `0 8px 24px ${alpha(success, 0.18)}`,
            }}
          >
            <CheckCircleIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: alpha(success, 0.9), fontWeight: 800, letterSpacing: 1.2 }}>
              Lançamento enviado
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25, mt: 0.25 }}>
              Marcação de envio
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              Este item já foi enviado à auditoria. O que deseja fazer com a marcação?
            </Typography>
          </Box>
        </Box>

        {row && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: alpha(theme.palette.background.paper, 0.72),
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.6 }}>
              LANÇAMENTO
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.25 }} noWrap>
              {row.nome || row.iniciais || 'Sem identificação'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              {[row.nip && `NIP ${row.nip}`, row.procedimento, row.valorNumerico > 0 && formatValorBrasileiro(row.valorNumerico)]
                .filter(Boolean)
                .join(' · ')}
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ px: 3, pb: 3, pt: 0.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Button
          variant="contained"
          color="warning"
          disabled={!canDesmarcar}
          onClick={onDesmarcar}
          startIcon={<UndoIcon />}
          sx={{
            py: 1.25,
            borderRadius: 2.5,
            fontWeight: 700,
            textTransform: 'none',
            boxShadow: `0 10px 28px ${alpha(theme.palette.warning.main, 0.28)}`,
          }}
        >
          Desmarcar para disponibilizar o envio novamente
        </Button>
        <Button
          variant="outlined"
          onClick={onClose}
          startIcon={<ShieldOutlinedIcon />}
          sx={{
            py: 1.25,
            borderRadius: 2.5,
            fontWeight: 700,
            textTransform: 'none',
            borderWidth: 2,
            '&:hover': { borderWidth: 2 },
          }}
        >
          Manter a marcação
        </Button>
      </Box>
    </Dialog>
  )
}
