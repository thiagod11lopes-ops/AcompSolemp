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
  const theme = useTheme()

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
            <AttachFileIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
              Enviar planilha
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
              Anexar documentos?
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Fechar">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pb: 3, pt: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Você pode anexar documentos de texto, PDF, Word, Excel, LibreOffice e formatos
          relacionados antes de concluir o envio.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} justifyContent="flex-end">
          <Button onClick={onNao} color="inherit" sx={{ fontWeight: 700 }}>
            Não
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={onSim}
            startIcon={<AttachFileIcon />}
            sx={{ fontWeight: 700 }}
          >
            Sim, anexar
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
