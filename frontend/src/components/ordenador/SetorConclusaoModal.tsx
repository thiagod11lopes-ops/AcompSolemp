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
import CalculateIcon from '@mui/icons-material/Calculate'
import SendIcon from '@mui/icons-material/Send'
import NotesIcon from '@mui/icons-material/Notes'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useEffect, useState, type ReactElement } from 'react'

export type SetorConclusaoVariante = 'auditoria' | 'contabilidade'

interface VarianteConfig {
  overline: string
  title: string
  etapaDe: string
  etapaPara: string | null
  notesHint: string
  placeholder: string
  submitLabel: string
  icon: ReactElement
  accent: 'secondary' | 'warning'
}

const VARIANTES: Record<SetorConclusaoVariante, VarianteConfig> = {
  auditoria: {
    overline: 'Conclusão de Auditoria',
    title: 'Enviar para Contabilidade/IMH',
    etapaDe: 'Auditoria',
    etapaPara: 'Contabilidade/IMH',
    notesHint: 'Anotações são opcionais. Se quiser, registre observações para a Contabilidade/IMH.',
    placeholder: 'Escreva anotações da auditoria, se necessário…',
    submitLabel: 'Enviar Contabilidade/IMH',
    icon: <FactCheckIcon sx={{ fontSize: 28 }} />,
    accent: 'secondary',
  },
  contabilidade: {
    overline: 'Conclusão de Contabilidade/IMH',
    title: 'Finalizar Contabilidade/IMH',
    etapaDe: 'Contabilidade/IMH',
    etapaPara: null,
    notesHint:
      'Anotações são opcionais. Se quiser, registre observações ao concluir a Contabilidade/IMH.',
    placeholder: 'Escreva anotações da Contabilidade/IMH, se necessário…',
    submitLabel: 'Concluir Contabilidade/IMH',
    icon: <CalculateIcon sx={{ fontSize: 28 }} />,
    accent: 'warning',
  },
}

interface SetorConclusaoModalProps {
  open: boolean
  variante: SetorConclusaoVariante
  onClose: () => void
  onEnviar: (anotacoes: string) => void
  loading?: boolean
  pedidoNumero?: string
}

export function SetorConclusaoModal({
  open,
  variante,
  onClose,
  onEnviar,
  loading = false,
  pedidoNumero,
}: SetorConclusaoModalProps) {
  const theme = useTheme()
  const [anotacoes, setAnotacoes] = useState('')
  const config = VARIANTES[variante]
  const accentColor = theme.palette[config.accent]

  useEffect(() => {
    if (open) setAnotacoes('')
  }, [open, variante])

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
            border: `1px solid ${alpha(accentColor.main, 0.25)}`,
            background: `
              radial-gradient(120% 80% at 0% 0%, ${alpha(accentColor.main, 0.22)} 0%, transparent 55%),
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
              background: `linear-gradient(145deg, ${accentColor.main}, ${theme.palette.primary.main})`,
              color: '#fff',
              boxShadow: `0 12px 28px ${alpha(accentColor.main, 0.45)}`,
            }}
          >
            {config.icon}
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
              {config.overline}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {config.title}
            </Typography>
            {pedidoNumero && (
              <Chip
                label={pedidoNumero}
                size="small"
                color={config.accent}
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
            bgcolor: alpha(accentColor.main, 0.08),
            border: `1px solid ${alpha(accentColor.main, 0.18)}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Chip label={config.etapaDe} size="small" color={config.accent} />
          <ArrowForwardIcon fontSize="small" color="action" />
          {config.etapaPara ? (
            <Chip label={config.etapaPara} size="small" color="primary" />
          ) : (
            <Chip
              icon={<CheckCircleIcon />}
              label="Etapa concluída"
              size="small"
              color="success"
            />
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {config.notesHint}
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
          placeholder={config.placeholder}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: alpha(theme.palette.background.default, 0.65),
              backdropFilter: 'blur(6px)',
              transition: 'box-shadow 0.2s, border-color 0.2s',
              '&:hover': {
                boxShadow: `0 0 0 1px ${alpha(accentColor.main, 0.25)}`,
              },
              '&.Mui-focused': {
                boxShadow: `0 0 0 3px ${alpha(accentColor.main, 0.2)}`,
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
            onClick={() => onEnviar(anotacoes.trim())}
            disabled={loading}
            endIcon={<SendIcon />}
            sx={{
              borderRadius: 3,
              py: 1.25,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${accentColor.main} 0%, ${theme.palette.primary.main} 100%)`,
              boxShadow: `0 12px 28px ${alpha(accentColor.main, 0.4)}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${accentColor.dark} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 16px 36px ${alpha(accentColor.main, 0.5)}`,
              },
            }}
          >
            {loading ? 'Enviando...' : config.submitLabel}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
