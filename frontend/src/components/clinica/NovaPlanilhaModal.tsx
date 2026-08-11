import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  IconButton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import { useEffect, useRef, useState } from 'react'

export type NovaPlanilhaModo = 'vazia' | 'importar'

export interface NovaPlanilhaInput {
  modo: NovaPlanilhaModo
  nome: string
  file?: File
}

interface NovaPlanilhaModalProps {
  open: boolean
  isLoading: boolean
  error: string | null
  onClose: () => void
  onConfirm: (input: NovaPlanilhaInput) => void
}

export function NovaPlanilhaModal({
  open,
  isLoading,
  error,
  onClose,
  onConfirm,
}: NovaPlanilhaModalProps) {
  const [modo, setModo] = useState<NovaPlanilhaModo>('vazia')
  const [nome, setNome] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setModo('vazia')
    setNome('')
    setArquivo(null)
  }, [open])

  const nomeEfetivo =
    nome.trim() ||
    (arquivo?.name ? arquivo.name.replace(/\.(ods|xlsx)$/i, '') : '') ||
    'Planilha sem nome'

  const podeConfirmar = modo === 'vazia' || Boolean(arquivo)

  const handleClose = () => {
    if (isLoading) return
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setArquivo(file)
      if (!nome.trim()) setNome(file.name.replace(/\.(ods|xlsx)$/i, ''))
    }
    e.target.value = ''
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(11, 61, 145, 0.18)',
          },
        },
      }}
    >
      <Box
        sx={(theme) => ({
          position: 'relative',
          px: 3,
          pt: 2.5,
          pb: 2,
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 55%, ${theme.palette.secondary.main} 100%)`,
          color: 'white',
        })}
      >
        <IconButton
          onClick={handleClose}
          disabled={isLoading}
          aria-label="Fechar"
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            color: 'white',
            bgcolor: alpha('#fff', 0.12),
            '&:hover': { bgcolor: alpha('#fff', 0.22) },
          }}
        >
          <CloseIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <NoteAddIcon sx={{ fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Adicionar nova planilha
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.75, pr: 4 }}>
          Abra uma planilha em branco (estilo Excel) ou importe um arquivo .ods/.xlsx.
        </Typography>
      </Box>

      <Box sx={{ px: 3, py: 3, display: 'grid', gap: 2.5 }}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={modo}
          onChange={(_, value: NovaPlanilhaModo | null) => {
            if (value) setModo(value)
          }}
          disabled={isLoading}
        >
          <ToggleButton value="vazia" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Planilha em branco
          </ToggleButton>
          <ToggleButton value="importar" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Importar ODS/XLSX
          </ToggleButton>
        </ToggleButtonGroup>

        <TextField
          label="Nome da planilha"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder={modo === 'vazia' ? 'Ex.: Planilha julho' : 'Nome do arquivo'}
          size="small"
          fullWidth
          disabled={isLoading}
        />

        {modo === 'importar' ? (
          <Box
            sx={(theme) => ({
              p: 2.5,
              borderRadius: 3,
              border: `2px dashed ${alpha(theme.palette.primary.main, arquivo ? 0.5 : 0.25)}`,
              bgcolor: alpha(theme.palette.primary.main, arquivo ? 0.06 : 0.02),
              textAlign: 'center',
            })}
          >
            {arquivo ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                <InsertDriveFileOutlinedIcon color="primary" sx={{ fontSize: 36 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textAlign: 'left' }}>
                  {arquivo.name}
                </Typography>
              </Box>
            ) : (
              <>
                <UploadFileIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7, mb: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Arquivo <strong>.ods</strong> ou <strong>.xlsx</strong>
                </Typography>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".ods,.xlsx,application/vnd.oasis.opendocument.spreadsheet,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hidden
              onChange={handleFileChange}
            />
            <Button
              variant={arquivo ? 'outlined' : 'contained'}
              startIcon={<UploadFileIcon />}
              onClick={() => inputRef.current?.click()}
              disabled={isLoading}
              sx={{ mt: arquivo ? 2 : 0, borderRadius: 2, fontWeight: 700 }}
            >
              Selecionar arquivo
            </Button>
          </Box>
        ) : (
          <Box
            sx={(theme) => ({
              p: 2,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.04),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
            })}
          >
            <Typography variant="body2" color="text.secondary">
              Será aberta uma grade em branco, como um arquivo novo do Excel.
            </Typography>
          </Box>
        )}

        {error && (
          <Typography variant="body2" color="error" sx={{ textAlign: 'center' }}>
            {error}
          </Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
          <Button onClick={handleClose} disabled={isLoading} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!podeConfirmar || isLoading}
            onClick={() =>
              onConfirm({
                modo,
                nome: nomeEfetivo,
                file: modo === 'importar' ? arquivo ?? undefined : undefined,
              })
            }
            startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{ borderRadius: 2, fontWeight: 700, px: 2.5 }}
          >
            {isLoading ? 'Abrindo...' : 'Abrir planilha'}
          </Button>
        </Box>
      </Box>
    </Dialog>
  )
}
