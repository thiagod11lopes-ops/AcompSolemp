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
  Typography,
} from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import SendIcon from '@mui/icons-material/Send'
import AttachFileIcon from '@mui/icons-material/AttachFile'

interface ImhDivMaterialEnvioModalProps {
  open: boolean
  imhCount: number
  divMaterialCount: number
  anexos?: File[]
  isSubmitting?: boolean
  onClose: () => void
  onEnviar: () => void
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
  const canSend = (imhCount > 0 || divMaterialCount > 0) && !isSubmitting

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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            mb: anexos.length > 0 ? 1 : 0,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {anexos.length > 0
              ? `${anexos.length} arquivo(s) em anexo`
              : 'Anexo opcional'}
          </Typography>
          {onAdicionarAnexos && (
            <Button
              size="small"
              startIcon={<AttachFileIcon />}
              disabled={isSubmitting}
              onClick={onAdicionarAnexos}
              sx={{ textTransform: 'none', fontWeight: 700 }}
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
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}
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
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onEnviar}
          disabled={!canSend}
          startIcon={<SendIcon />}
        >
          {isSubmitting ? 'Enviando...' : 'Enviar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
