import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import SendIcon from '@mui/icons-material/Send'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { useEffect, useState } from 'react'

interface ImhDivMaterialEnvioModalProps {
  open: boolean
  imhCount: number
  divMaterialCount: number
  anexos?: File[]
  isSubmitting?: boolean
  onClose: () => void
  onEnviar: (comentario: string) => void
  /** Abre o seletor para acumular mais arquivos. */
  onAdicionarAnexos?: () => void
  onRemoverAnexo?: (index: number) => void
}

export function ImhDivMaterialEnvioModal({
  open,
  imhCount,
  divMaterialCount,
  anexos = [],
  isSubmitting = false,
  onClose,
  onEnviar,
  onAdicionarAnexos,
  onRemoverAnexo,
}: ImhDivMaterialEnvioModalProps) {
  const [comentario, setComentario] = useState('')
  const canSend = (imhCount > 0 || divMaterialCount > 0) && !isSubmitting

  useEffect(() => {
    if (open) setComentario('')
  }, [open])

  return (
    <Dialog
      open={open}
      onClose={
        isSubmitting
          ? undefined
          : (_event, reason) => {
              // Evita fechar por clique fantasma do seletor de arquivos do Windows.
              if (reason === 'backdropClick') return
              onClose()
            }
      }
      disableRestoreFocus
      disableEnforceFocus
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Enviar planilha</DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
          {imhCount > 0 && (
            <Chip
              size="small"
              color="info"
              variant="outlined"
              label={`IMH → Auditoria (${imhCount})`}
              sx={{ fontWeight: 600 }}
            />
          )}
          {divMaterialCount > 0 && (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={`Div. Material → Solemp (${divMaterialCount})`}
              sx={{ fontWeight: 600 }}
            />
          )}
        </Stack>

        <Box
          sx={{
            mb: 1.5,
            p: 1.25,
            borderRadius: '12px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgba(85, 139, 113, 0.06)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              mb: anexos.length > 0 ? 1 : 0,
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'text.secondary' }}>
                Arquivo anexado
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {anexos.length > 0
                  ? `${anexos.length} arquivo(s) pronto(s)`
                  : 'Opcional — anexe se necessário'}
              </Typography>
            </Box>
            {onAdicionarAnexos && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<AttachFileIcon />}
                disabled={isSubmitting}
                onClick={onAdicionarAnexos}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '11px',
                  borderColor: 'rgba(85, 139, 113, 0.45)',
                }}
              >
                Anexar
              </Button>
            )}
          </Box>

          {anexos.length > 0 && (
            <Stack spacing={0.5}>
              {anexos.map((file, index) => (
                <Box
                  key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    minWidth: 0,
                    px: 1,
                    py: 0.5,
                    borderRadius: '8px',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ flex: 1, minWidth: 0, wordBreak: 'break-word', fontWeight: 600 }}
                    noWrap
                    title={file.name}
                  >
                    {file.name}
                  </Typography>
                  {onRemoverAnexo && (
                    <IconButton
                      size="small"
                      aria-label={`Remover ${file.name}`}
                      disabled={isSubmitting}
                      onClick={() => onRemoverAnexo(index)}
                      color="error"
                    >
                      <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        <TextField
          fullWidth
          size="small"
          label="Comentários"
          placeholder="Opcional — aparece na aba lateral da timeline com o seu nome"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          disabled={isSubmitting}
          multiline
          minRows={2}
        />
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={isSubmitting}
          color="inherit"
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '11px' }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={() => onEnviar(comentario.trim())}
          disabled={!canSend}
          startIcon={<SendIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: '11px',
            px: 2,
            boxShadow: '0 6px 14px rgba(63, 107, 86, 0.22)',
            background: 'linear-gradient(135deg, #558b71 0%, #3f6b56 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #61987d 0%, #4a7a63 100%)',
              boxShadow: '0 8px 18px rgba(63, 107, 86, 0.3)',
            },
            '&.Mui-disabled': {
              background: 'rgba(85, 139, 113, 0.2)',
              color: 'rgba(0,0,0,0.38)',
            },
          }}
        >
          {isSubmitting ? 'Enviando...' : 'Enviar planilha'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
