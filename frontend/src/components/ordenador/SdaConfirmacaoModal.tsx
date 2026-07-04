import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  alpha,
  useTheme,
  Chip,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import SendIcon from '@mui/icons-material/Send'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

interface SdaConfirmacaoModalProps {
  open: boolean
  onClose: () => void
  onConfirmar: () => void
  loading?: boolean
  pedidoNumero?: string
  solempNumero: string
}

export function SdaConfirmacaoModal({
  open,
  onClose,
  onConfirmar,
  loading = false,
  pedidoNumero,
  solempNumero,
}: SdaConfirmacaoModalProps) {
  const theme = useTheme()

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
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
              radial-gradient(120% 80% at 0% 0%, ${alpha(theme.palette.primary.main, 0.2)} 0%, transparent 55%),
              radial-gradient(100% 70% at 100% 100%, ${alpha(theme.palette.secondary.main, 0.14)} 0%, transparent 50%),
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
            <AccountTreeIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
              SDA — Assinatura Realizada
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Confirmar assinatura
            </Typography>
            {pedidoNumero && (
              <Chip
                label={pedidoNumero}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ mt: 1, fontWeight: 600 }}
              />
            )}
          </Box>
        </Box>
        <IconButton onClick={onClose} disabled={loading} size="small" aria-label="Fechar">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pb: 3, pt: 0 }}>
        <Box
          sx={{
            mb: 2.5,
            p: 2,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Chip label="SDA" size="small" color="primary" />
          <ArrowForwardIcon fontSize="small" color="action" />
          <Chip label="Finanças Pagamento" size="small" color="success" />
        </Box>

        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            mb: 2.5,
            textAlign: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.06),
            border: `1px dashed ${alpha(theme.palette.primary.main, 0.35)}`,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Número da SOLEMP
          </Typography>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, letterSpacing: 1, color: 'primary.main', lineHeight: 1.2 }}
          >
            {solempNumero}
          </Typography>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            mb: 3,
            bgcolor: alpha(theme.palette.info.main, 0.08),
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800, textAlign: 'center' }}>
            A assinatura se refere ao número da SOLEMP mostrado acima?
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5,
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            onClick={onClose}
            disabled={loading}
            sx={{ borderRadius: 3, py: 1.25, fontWeight: 700 }}
          >
            Cancelar
          </Button>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={onConfirmar}
            disabled={loading || !solempNumero || solempNumero === 'Não informada'}
            endIcon={<SendIcon />}
            sx={{
              borderRadius: 3,
              py: 1.25,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.4)}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                boxShadow: `0 16px 36px ${alpha(theme.palette.primary.main, 0.5)}`,
              },
            }}
          >
            {loading ? 'Enviando...' : 'Confirmar e enviar para Finanças'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
