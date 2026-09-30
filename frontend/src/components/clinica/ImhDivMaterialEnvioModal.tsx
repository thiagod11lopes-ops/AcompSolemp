import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { useEffect, useState } from 'react'
import { EnvioFluxoDialog } from '@/components/common/EnvioFluxoDialog'

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
  const hasPlanilha = imhCount > 0 || divMaterialCount > 0

  useEffect(() => {
    if (open) setComentario('')
  }, [open])

  const chips = [
    ...(imhCount > 0
      ? [{ label: `IMH → Auditoria (${imhCount})`, color: 'info' as const }]
      : []),
    ...(divMaterialCount > 0
      ? [{ label: `Div. Material → Solemp (${divMaterialCount})`, color: 'primary' as const }]
      : []),
  ]

  return (
    <EnvioFluxoDialog
      open={open}
      title="Enviar planilha"
      onClose={onClose}
      onSubmit={() => onEnviar(comentario.trim())}
      loading={isSubmitting}
      submitDisabled={!hasPlanilha}
      chips={chips}
      blockBackdropClose
    >
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
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
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
    </EnvioFluxoDialog>
  )
}
