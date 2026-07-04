import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  alpha,
  useTheme,
  Chip,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import SendIcon from '@mui/icons-material/Send'
import NotesIcon from '@mui/icons-material/Notes'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { useEffect, useState } from 'react'

interface AuditoriaConclusaoModalProps {
  open: boolean
  onClose: () => void
  onEnviar: (anotacoes: string) => void
  loading?: boolean
  pedidoNumero?: string
}

export function AuditoriaConclusaoModal({
  open,
  onClose,
  onEnviar,
  loading = false,
  pedidoNumero,
}: AuditoriaConclusaoModalProps) {
  const theme = useTheme()
  const [anotacoes, setAnotacoes] = useState('')

  useEffect(() => {
    if (open) setAnotacoes('')
  }, [open])

  const handleEnviar = () => {
    onEnviar(anotacoes.trim())
  }

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
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.25)}`,
            background: `
              radial-gradient(120% 80% at 0% 0%, ${alpha(theme.palette.secondary.main, 0.22)} 0%, transparent 55%),
              radial-gradient(100% 70% at 100% 100%, ${alpha(theme.palette.primary.main, 0.16)} 0%, transparent 50%),
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
              background: `linear-gradient(145deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
              color: '#fff',
              boxShadow: `0 12px 28px ${alpha(theme.palette.secondary.main, 0.45)}`,
            }}
          >
            <FactCheckIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
              Conclusão de Auditoria
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Enviar para Contabilidade/IMH
            </Typography>
            {pedidoNumero && (
              <Chip
                label={pedidoNumero}
                size="small"
                color="secondary"
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
            bgcolor: alpha(theme.palette.secondary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.18)}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Chip label="Auditoria" size="small" color="secondary" />
          <ArrowForwardIcon fontSize="small" color="action" />
          <Chip label="Contabilidade/IMH" size="small" color="primary" />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Anotações são opcionais. Se quiser, registre observações para a Contabilidade/IMH.
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <NotesIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Anotações
          </Typography>
          <Chip label="Opcional" size="small" variant="outlined" sx={{ height: 22 }} />
        </Box>

        <TextField
          fullWidth
          multiline
          minRows={5}
          maxRows={10}
          value={anotacoes}
          onChange={(e) => setAnotacoes(e.target.value)}
          placeholder="Escreva anotações da auditoria, se necessário…"
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: alpha(theme.palette.background.default, 0.65),
              backdropFilter: 'blur(6px)',
              transition: 'box-shadow 0.2s, border-color 0.2s',
              '&:hover': {
                boxShadow: `0 0 0 1px ${alpha(theme.palette.secondary.main, 0.25)}`,
              },
              '&.Mui-focused': {
                boxShadow: `0 0 0 3px ${alpha(theme.palette.secondary.main, 0.2)}`,
              },
            },
          }}
        />

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1, textAlign: 'right' }}
        >
          {anotacoes.trim().length === 0
            ? 'Nenhuma anotação — pode enviar assim mesmo'
            : `${anotacoes.trim().length} caractere(s)`}
        </Typography>

        <Box
          sx={{
            mt: 3,
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
            sx={{ borderRadius: 3, py: 1.25 }}
          >
            Cancelar
          </Button>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleEnviar}
            disabled={loading}
            endIcon={<SendIcon />}
            sx={{
              borderRadius: 3,
              py: 1.25,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.primary.main} 100%)`,
              boxShadow: `0 12px 28px ${alpha(theme.palette.secondary.main, 0.4)}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.secondary.dark} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 16px 36px ${alpha(theme.palette.secondary.main, 0.5)}`,
              },
            }}
          >
            {loading ? 'Enviando...' : 'Enviar Contabilidade/IMH'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
