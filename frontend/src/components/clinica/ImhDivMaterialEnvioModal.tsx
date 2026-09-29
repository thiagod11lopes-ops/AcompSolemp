import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  alpha,
} from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import SendIcon from '@mui/icons-material/Send'
import InventoryIcon from '@mui/icons-material/Inventory'
import DescriptionIcon from '@mui/icons-material/Description'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import AddIcon from '@mui/icons-material/Add'

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
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 800 }}>Destinos do envio</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Somente as linhas marcadas no checklist serão enviadas.
        </Typography>

        <Stack spacing={1.25}>
          <Box
            sx={(theme) => ({
              py: 1.5,
              px: 2,
              borderRadius: 2,
              border: 1,
              borderColor: imhCount > 0 ? 'info.main' : 'divider',
              bgcolor: alpha(theme.palette.info.main, imhCount > 0 ? 0.06 : 0.02),
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5,
            })}
          >
            <DescriptionIcon
              color={imhCount > 0 ? 'info' : 'disabled'}
              sx={{ mt: 0.25, flexShrink: 0 }}
            />
            <Box>
              <Typography sx={{ fontWeight: 700 }}>Planilha IMH → Auditoria</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                {imhCount > 0
                  ? `${imhCount} lançamento(s) marcado(s) serão encaminhados para Auditoria.`
                  : 'Nenhuma linha marcada na IMH — este destino não será enviado agora.'}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={(theme) => ({
              py: 1.5,
              px: 2,
              borderRadius: 2,
              border: 1,
              borderColor: divMaterialCount > 0 ? 'primary.main' : 'divider',
              bgcolor: alpha(theme.palette.primary.main, divMaterialCount > 0 ? 0.06 : 0.02),
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5,
            })}
          >
            <InventoryIcon
              color={divMaterialCount > 0 ? 'primary' : 'disabled'}
              sx={{ mt: 0.25, flexShrink: 0 }}
            />
            <Box>
              <Typography sx={{ fontWeight: 700 }}>
                Div. Material → Confecção de Solemp
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                {divMaterialCount > 0
                  ? `${divMaterialCount} lançamento(s) marcado(s) serão encaminhados para Confecção de Solemp.`
                  : 'Nenhuma linha marcada na Div. Material — este destino não será enviado agora.'}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={(theme) => ({
              py: 1.5,
              px: 2,
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              bgcolor: alpha(theme.palette.success.main, 0.04),
            })}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                mb: anexos.length > 0 ? 1.25 : 0,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                <AttachFileIcon color="action" sx={{ flexShrink: 0 }} />
                <Typography sx={{ fontWeight: 700 }}>
                  {anexos.length > 0
                    ? `${anexos.length} arquivo(s) em anexo`
                    : 'Nenhum arquivo em anexo'}
                </Typography>
              </Box>
              {onAdicionarAnexos && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  disabled={isSubmitting}
                  onClick={onAdicionarAnexos}
                  sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
                >
                  Adicionar
                </Button>
              )}
            </Stack>

            {anexos.length > 0 && (
              <Stack spacing={0.75}>
                {anexos.map((file, index) => (
                  <Box
                    key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                    sx={(theme) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.25,
                      py: 0.85,
                      borderRadius: 1.5,
                      border: 1,
                      borderColor: 'divider',
                      bgcolor: alpha(theme.palette.background.default, 0.6),
                    })}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        wordBreak: 'break-word',
                        fontWeight: 600,
                      }}
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

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              É possível anexar vários documentos (PDF, Word, Excel, LibreOffice e afins).
            </Typography>
          </Box>
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          É necessário marcar ao menos uma linha em IMH ou em Div. Material.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
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
          {isSubmitting
            ? 'Enviando...'
            : imhCount > 0 && divMaterialCount > 0
              ? 'Enviar para Auditoria e Confecção'
              : imhCount > 0
                ? 'Enviar IMH para Auditoria'
                : 'Enviar Div. Material'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
