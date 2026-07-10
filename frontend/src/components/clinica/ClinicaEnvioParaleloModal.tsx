import {
  Box,
  Button,
  Dialog,
  IconButton,
  Stack,
  Typography,
  alpha,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SendIcon from '@mui/icons-material/Send'
import InventoryIcon from '@mui/icons-material/Inventory'
import DescriptionIcon from '@mui/icons-material/Description'
import { motion } from 'framer-motion'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import { formatValorBrasileiro } from '@/utils/consumoMaterialOds'

interface ClinicaEnvioParaleloModalProps {
  open: boolean
  rows: ConsumoMaterialRow[]
  isSubmitting?: boolean
  onClose: () => void
  onVisualizarAuditoria: () => void
  onVisualizarConfeccao: () => void
  onEnviarAmbas: () => void
}

export function ClinicaEnvioParaleloModal({
  open,
  rows,
  isSubmitting = false,
  onClose,
  onVisualizarAuditoria,
  onVisualizarConfeccao,
  onEnviarAmbas,
}: ClinicaEnvioParaleloModalProps) {
  const total = rows.reduce((sum, row) => sum + (row.valorNumerico || 0), 0)

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            background: 'linear-gradient(165deg, #0f172a 0%, #1e293b 55%, #0b3d91 140%)',
            color: '#f8fafc',
            boxShadow: '0 28px 80px rgba(15,23,42,0.55)',
          },
        },
        backdrop: {
          sx: { backdropFilter: 'blur(8px)', backgroundColor: 'rgba(2,6,23,0.55)' },
        },
      }}
    >
      <Box sx={{ position: 'relative', p: { xs: 2.5, sm: 3.5 } }}>
        <IconButton
          onClick={onClose}
          disabled={isSubmitting}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            color: alpha('#fff', 0.8),
            '&:hover': { bgcolor: alpha('#fff', 0.08) },
          }}
          aria-label="Fechar"
        >
          <CloseIcon />
        </IconButton>

        <Stack spacing={0.75} sx={{ pr: 5, mb: 3 }}>
          <Typography
            variant="overline"
            sx={{ letterSpacing: 1.6, color: alpha('#93c5fd', 0.95), fontWeight: 700 }}
          >
            Envio paralelo
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            Confecção Solemp / Auditoria
          </Typography>
          <Typography variant="body2" sx={{ color: alpha('#e2e8f0', 0.82) }}>
            {rows.length} lançamento(s) selecionado(s) · Total {formatValorBrasileiro(total)}
          </Typography>
        </Stack>

        <Stack spacing={1.5}>
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<DescriptionIcon />}
              endIcon={<VisibilityIcon />}
              onClick={onVisualizarAuditoria}
              disabled={isSubmitting || rows.length === 0}
              sx={{
                justifyContent: 'space-between',
                py: 1.75,
                px: 2.25,
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: alpha('#38bdf8', 0.16),
                color: '#e0f2fe',
                border: `1px solid ${alpha('#38bdf8', 0.35)}`,
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: alpha('#38bdf8', 0.24),
                  boxShadow: `0 12px 28px ${alpha('#0ea5e9', 0.25)}`,
                },
              }}
            >
              Visualizar planilha — Auditoria
            </Button>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<InventoryIcon />}
              endIcon={<VisibilityIcon />}
              onClick={onVisualizarConfeccao}
              disabled={isSubmitting || rows.length === 0}
              sx={{
                justifyContent: 'space-between',
                py: 1.75,
                px: 2.25,
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: alpha('#a78bfa', 0.16),
                color: '#ede9fe',
                border: `1px solid ${alpha('#a78bfa', 0.35)}`,
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: alpha('#a78bfa', 0.24),
                  boxShadow: `0 12px 28px ${alpha('#8b5cf6', 0.25)}`,
                },
              }}
            >
              Visualizar planilha — Confecção de Solemp
            </Button>
          </motion.div>
        </Stack>

        <Box
          sx={{
            mt: 3,
            pt: 2.5,
            borderTop: `1px solid ${alpha('#fff', 0.12)}`,
          }}
        >
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<SendIcon />}
            onClick={onEnviarAmbas}
            disabled={isSubmitting || rows.length === 0}
            sx={{
              py: 1.9,
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              boxShadow: '0 14px 34px rgba(37,99,235,0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)',
              },
            }}
          >
            {isSubmitting
              ? 'Enviando ambas as planilhas...'
              : 'Enviar para Confecção Solemp e Auditoria'}
          </Button>
          <Typography
            variant="caption"
            sx={{ display: 'block', mt: 1.25, textAlign: 'center', color: alpha('#cbd5e1', 0.8) }}
          >
            As duas trilhas seguem em paralelo na timeline, como antes.
          </Typography>
        </Box>
      </Box>
    </Dialog>
  )
}
