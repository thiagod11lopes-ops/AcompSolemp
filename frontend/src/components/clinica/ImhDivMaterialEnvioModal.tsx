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
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import SendIcon from '@mui/icons-material/Send'
import InventoryIcon from '@mui/icons-material/Inventory'
import DescriptionIcon from '@mui/icons-material/Description'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import AddIcon from '@mui/icons-material/Add'
import { motion } from 'framer-motion'

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
  const theme = useTheme()
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
            <SendIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
              Enviar planilha
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Destinos do envio
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} disabled={isSubmitting} size="small" aria-label="Fechar">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pb: 3, pt: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Somente as linhas marcadas no checklist serão enviadas.
        </Typography>

        <Stack spacing={1.5}>
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
            <Box
              sx={{
                py: 1.75,
                px: 2.25,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.info.main, 0.08),
                border: `1px solid ${alpha(theme.palette.info.main, 0.28)}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
              }}
            >
              <DescriptionIcon sx={{ mt: 0.25, color: 'info.main' }} />
              <Box>
                <Typography sx={{ fontWeight: 800 }}>Planilha IMH → Auditoria</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
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
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
              }}
            >
              <InventoryIcon sx={{ mt: 0.25, color: 'primary.main' }} />
              <Box>
                <Typography sx={{ fontWeight: 800 }}>
                  Div. Material → Confecção de Solemp
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                  {divMaterialCount > 0
                    ? `${divMaterialCount} lançamento(s) marcado(s) serão encaminhados para Confecção de Solemp.`
                    : 'Nenhuma linha marcada na Div. Material — este destino não será enviado agora.'}
                </Typography>
              </Box>
            </Box>
          </motion.div>

          <Box
            sx={{
              py: 1.5,
              px: 2.25,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.success.main, 0.06),
              border: `1px solid ${alpha(theme.palette.success.main, 0.28)}`,
            }}
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
                <AttachFileIcon sx={{ color: 'success.main', flexShrink: 0 }} />
                <Typography sx={{ fontWeight: 800 }}>
                  {anexos.length > 0
                    ? `${anexos.length} arquivo(s) em anexo`
                    : 'Nenhum arquivo em anexo'}
                </Typography>
              </Box>
              {onAdicionarAnexos && (
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
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
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.25,
                      py: 0.85,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.success.main, 0.04),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                    }}
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

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3 }}>
          <Button onClick={onClose} disabled={isSubmitting} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={onEnviar}
            disabled={!canSend}
            startIcon={<SendIcon />}
            sx={{ fontWeight: 700 }}
          >
            {isSubmitting
              ? 'Enviando...'
              : imhCount > 0 && divMaterialCount > 0
                ? 'Enviar para Auditoria e Confecção'
                : imhCount > 0
                  ? 'Enviar IMH para Auditoria'
                  : 'Enviar Div. Material'}
          </Button>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1.25, textAlign: 'right' }}
        >
          É necessário marcar ao menos uma linha em IMH ou em Div. Material.
        </Typography>
      </DialogContent>
    </Dialog>
  )
}
