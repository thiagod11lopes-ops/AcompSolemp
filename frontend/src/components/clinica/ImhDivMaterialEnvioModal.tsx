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
import SendIcon from '@mui/icons-material/Send'
import InventoryIcon from '@mui/icons-material/Inventory'
import DescriptionIcon from '@mui/icons-material/Description'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { motion } from 'framer-motion'

interface ImhDivMaterialEnvioModalProps {
  open: boolean
  imhCount: number
  divMaterialCount: number
  anexos?: File[]
  isSubmitting?: boolean
  onClose: () => void
  onEnviar: () => void
}

export function ImhDivMaterialEnvioModal({
  open,
  imhCount,
  divMaterialCount,
  anexos = [],
  isSubmitting = false,
  onClose,
  onEnviar,
}: ImhDivMaterialEnvioModalProps) {
  const canSend = (imhCount > 0 || divMaterialCount > 0) && !isSubmitting

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
            Enviar planilha
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            Destinos do envio
          </Typography>
          <Typography variant="body2" sx={{ color: alpha('#e2e8f0', 0.82) }}>
            Somente as linhas marcadas no checklist serão enviadas.
          </Typography>
        </Stack>

        <Stack spacing={1.5}>
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
            <Box
              sx={{
                py: 1.75,
                px: 2.25,
                borderRadius: 3,
                bgcolor: alpha('#38bdf8', 0.16),
                border: `1px solid ${alpha('#38bdf8', 0.35)}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
              }}
            >
              <DescriptionIcon sx={{ mt: 0.25, color: '#e0f2fe' }} />
              <Box>
                <Typography sx={{ fontWeight: 800, color: '#e0f2fe' }}>
                  Planilha IMH → Auditoria
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#e2e8f0', 0.8), mt: 0.35 }}>
                  {imhCount > 0
                    ? `${imhCount} lançamento(s) marcado(s) serão encaminhados para Auditoria.`
                    : 'Nenhuma linha marcada na IMH — este destino não será enviado agora.'}
                </Typography>
              </Box>
            </Box>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
            <Box
              sx={{
                py: 1.75,
                px: 2.25,
                borderRadius: 3,
                bgcolor: alpha('#a78bfa', 0.16),
                border: `1px solid ${alpha('#a78bfa', 0.35)}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
              }}
            >
              <InventoryIcon sx={{ mt: 0.25, color: '#ede9fe' }} />
              <Box>
                <Typography sx={{ fontWeight: 800, color: '#ede9fe' }}>
                  Div. Material → Confecção de Solemp
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#e2e8f0', 0.8), mt: 0.35 }}>
                  {divMaterialCount > 0
                    ? `${divMaterialCount} lançamento(s) marcado(s) serão encaminhados para Confecção de Solemp.`
                    : 'Nenhuma linha marcada na Div. Material — este destino não será enviado agora.'}
                </Typography>
              </Box>
            </Box>
          </motion.div>

          {anexos.length > 0 ? (
            <Box
              sx={{
                py: 1.5,
                px: 2.25,
                borderRadius: 3,
                bgcolor: alpha('#34d399', 0.12),
                border: `1px solid ${alpha('#34d399', 0.35)}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
              }}
            >
              <AttachFileIcon sx={{ mt: 0.25, color: '#d1fae5' }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800, color: '#d1fae5' }}>
                  {anexos.length} arquivo(s) em anexo
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: alpha('#e2e8f0', 0.85),
                    mt: 0.35,
                    wordBreak: 'break-word',
                  }}
                >
                  {anexos.map((file) => file.name).join(' · ')}
                </Typography>
              </Box>
            </Box>
          ) : null}
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
            onClick={onEnviar}
            disabled={!canSend}
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
              ? 'Enviando planilhas...'
              : imhCount > 0 && divMaterialCount > 0
                ? 'Enviar para Auditoria e Confecção de Solemp'
                : imhCount > 0
                  ? 'Enviar IMH para Auditoria'
                  : 'Enviar Div. Material para Confecção de Solemp'}
          </Button>
          <Typography
            variant="caption"
            sx={{ display: 'block', mt: 1.25, textAlign: 'center', color: alpha('#cbd5e1', 0.8) }}
          >
            É necessário marcar ao menos uma linha em IMH ou em Div. Material.
          </Typography>
        </Box>
      </Box>
    </Dialog>
  )
}
