import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Typography,
  alpha,
  useTheme,
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
  const theme = useTheme()
  const total = rows.reduce((sum, row) => sum + (row.valorNumerico || 0), 0)

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(10px)',
            backgroundColor: alpha('#0b1220', 0.55),
          },
        },
        paper: {
          sx: {
            borderRadius: 5,
            overflow: 'hidden',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
            background: `
              radial-gradient(120% 80% at 0% 0%, ${alpha(theme.palette.primary.main, 0.16)} 0%, transparent 55%),
              radial-gradient(100% 70% at 100% 100%, ${alpha(theme.palette.secondary.main, 0.12)} 0%, transparent 50%),
              ${theme.palette.background.paper}
            `,
            boxShadow: `0 32px 100px ${alpha('#000', 0.35)}`,
          },
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 2,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(145deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              color: '#fff',
              boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.45)}`,
            }}
          >
            <SendIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
              Envio para Auditoria
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Div. de Material — Auditoria
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} disabled={isSubmitting} size="small" aria-label="Fechar">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pb: 3, pt: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {rows.length} lançamento(s) selecionado(s) · Total {formatValorBrasileiro(total)}. A
          Auditoria encaminhará a planilha para IMH e Confecção de Solemp.
        </Typography>

        <Stack spacing={1.5}>
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
            <Button
              fullWidth
              variant="outlined"
              color="info"
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
              }}
            >
              Visualizar planilha — Auditoria
            </Button>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
            <Button
              fullWidth
              variant="outlined"
              color="primary"
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
              }}
            >
              Visualizar planilha — Confecção de Solemp
            </Button>
          </motion.div>
        </Stack>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3 }}>
          <Button onClick={onClose} disabled={isSubmitting} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={onEnviarAmbas}
            disabled={isSubmitting || rows.length === 0}
            startIcon={<SendIcon />}
            sx={{ fontWeight: 700 }}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar para Auditoria'}
          </Button>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1.25, textAlign: 'right' }}
        >
          Após a Auditoria, a planilha segue para IMH e Confecção de Solemp.
        </Typography>
      </DialogContent>
    </Dialog>
  )
}
