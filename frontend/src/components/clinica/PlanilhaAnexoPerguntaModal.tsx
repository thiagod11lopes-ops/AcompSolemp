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
import AttachFileIcon from '@mui/icons-material/AttachFile'

interface PlanilhaAnexoPerguntaModalProps {
  open: boolean
  onClose: () => void
  onSim: () => void
  onNao: () => void
}

export function PlanilhaAnexoPerguntaModal({
  open,
  onClose,
  onSim,
  onNao,
}: PlanilhaAnexoPerguntaModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
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
      <Box sx={{ position: 'relative', p: { xs: 2.5, sm: 3 } }}>
        <IconButton
          onClick={onClose}
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

        <Stack spacing={1} sx={{ pr: 4, mb: 3 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha('#38bdf8', 0.18),
              border: `1px solid ${alpha('#38bdf8', 0.35)}`,
              mb: 0.5,
            }}
          >
            <AttachFileIcon sx={{ color: '#e0f2fe' }} />
          </Box>
          <Typography
            variant="overline"
            sx={{ letterSpacing: 1.6, color: alpha('#93c5fd', 0.95), fontWeight: 700 }}
          >
            Enviar planilha
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
            Deseja enviar algum arquivo em anexo?
          </Typography>
          <Typography variant="body2" sx={{ color: alpha('#e2e8f0', 0.82) }}>
            Você pode anexar documentos de texto, PDF, Word, Excel, LibreOffice e formatos
            relacionados antes de concluir o envio.
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          <Button
            fullWidth
            variant="outlined"
            onClick={onNao}
            sx={{
              py: 1.35,
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              color: '#f8fafc',
              borderColor: alpha('#fff', 0.28),
              '&:hover': {
                borderColor: alpha('#fff', 0.5),
                bgcolor: alpha('#fff', 0.06),
              },
            }}
          >
            Não
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={onSim}
            startIcon={<AttachFileIcon />}
            sx={{
              py: 1.35,
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              boxShadow: '0 12px 28px rgba(37,99,235,0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)',
              },
            }}
          >
            Sim
          </Button>
        </Stack>
      </Box>
    </Dialog>
  )
}
