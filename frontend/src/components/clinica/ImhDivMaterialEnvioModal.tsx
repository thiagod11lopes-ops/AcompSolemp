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
      <Box sx={{ position: 'relative', p: { xs: 2.5, sm: 3.5 } }}>
        <IconButton
          onClick={onClose}
          disabled={isSubmitting}
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

        <Stack spacing={0.75} sx={{ pr: 5, mb: 3 }}>
          <Typography
            variant="overline"
            sx={{ letterSpacing: 1.6, color: alpha('#93c5fd', 0.95), fontWeight: 700 }}
          >
            Enviar planilha
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            Destinos do envio
          </Typography>
          <Typography variant="body2" sx={{ color: alpha('#e2e8f0', 0.82) }}>
            Somente as linhas marcadas no checklist serão enviadas.
          </Typography>
        </Stack>

        <Stack spacing={1.5}>
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
            <Box
              sx={{
                py: 1.75,
                px: 2.25,
                borderRadius: 3,
                bgcolor: alpha('#38bdf8', 0.16),
                border: `1px solid ${alpha('#38bdf8', 0.35)}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
              }}
            >
              <DescriptionIcon sx={{ mt: 0.25, color: '#e0f2fe' }} />
              <Box>
                <Typography sx={{ fontWeight: 800, color: '#e0f2fe' }}>
                  Planilha IMH → Auditoria
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#e2e8f0', 0.8), mt: 0.35 }}>
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
                bgcolor: alpha('#a78bfa', 0.16),
                border: `1px solid ${alpha('#a78bfa', 0.35)}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
              }}
            >
              <InventoryIcon sx={{ mt: 0.25, color: '#ede9fe' }} />
              <Box>
                <Typography sx={{ fontWeight: 800, color: '#ede9fe' }}>
                  Div. Material → Confecção de Solemp
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#e2e8f0', 0.8), mt: 0.35 }}>
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
              bgcolor: alpha('#34d399', 0.12),
              border: `1px solid ${alpha('#34d399', 0.35)}`,
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
                <AttachFileIcon sx={{ color: '#d1fae5', flexShrink: 0 }} />
                <Typography sx={{ fontWeight: 800, color: '#d1fae5' }}>
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
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    flexShrink: 0,
                    color: '#d1fae5',
                    borderColor: alpha('#6ee7b7', 0.55),
                    '&:hover': {
                      borderColor: '#a7f3d0',
                      bgcolor: alpha('#34d399', 0.12),
                    },
                  }}
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
                      bgcolor: alpha('#022c22', 0.35),
                      border: `1px solid ${alpha('#6ee7b7', 0.25)}`,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        color: alpha('#ecfdf5', 0.95),
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
                        sx={{
                          color: alpha('#fecaca', 0.95),
                          '&:hover': { bgcolor: alpha('#ef4444', 0.15) },
                        }}
                      >
                        <DeleteOutlinedIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </Stack>
            )}

            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 1, color: alpha('#a7f3d0', 0.75) }}
            >
              É possível anexar vários documentos (PDF, Word, Excel, LibreOffice e afins).
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            mt: 3,
            pt: 2.5,
            borderTop: `1px solid ${alpha('#fff', 0.12)}`,
          }}
        >
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<SendIcon />}
            onClick={onEnviar}
            disabled={!canSend}
            sx={{
              py: 1.9,
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 800,
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              boxShadow: '0 14px 34px rgba(37,99,235,0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)',
              },
            }}
          >
            {isSubmitting
              ? 'Enviando planilhas...'
              : imhCount > 0 && divMaterialCount > 0
                ? 'Enviar para Auditoria e Confecção de Solemp'
                : imhCount > 0
                  ? 'Enviar IMH para Auditoria'
                  : 'Enviar Div. Material para Confecção de Solemp'}
          </Button>
          <Typography
            variant="caption"
            sx={{ display: 'block', mt: 1.25, textAlign: 'center', color: alpha('#cbd5e1', 0.8) }}
          >
            É necessário marcar ao menos uma linha em IMH ou em Div. Material.
          </Typography>
        </Box>
      </Box>
    </Dialog>
  )
}
