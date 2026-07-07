import {
  Box,
  Button,
  Dialog,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  alpha,
  CircularProgress,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import { useRef, useState } from 'react'
import {
  ANOS_PLANILHA_DISPONIVEIS,
  getMesAtualModelo,
  getMesModeloFromParts,
} from '@/utils/consumoMaterialTemplate'

const MESES_OPCOES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
]

interface AdicionarPlanilhaModalProps {
  open: boolean
  isLoading: boolean
  error: string | null
  onClose: () => void
  onFileSelected: (mes: number, ano: number, file: File) => void
}

export function AdicionarPlanilhaModal({
  open,
  isLoading,
  error,
  onClose,
  onFileSelected,
}: AdicionarPlanilhaModalProps) {
  const mesAtual = getMesAtualModelo()
  const [mes, setMes] = useState(mesAtual.mes)
  const [ano, setAno] = useState(mesAtual.ano)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const mesModelo = getMesModeloFromParts(mes, ano)

  const handleClose = () => {
    if (isLoading) return
    setArquivo(null)
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setArquivo(file)
    }
    e.target.value = ''
  }

  const handleConfirmar = () => {
    if (arquivo) {
      onFileSelected(mes, ano, arquivo)
    }
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
            borderRadius: 4,
            overflow: 'hidden',
            background: (theme) =>
              `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${theme.palette.background.paper} 35%)`,
            boxShadow: '0 24px 80px rgba(11, 61, 145, 0.18)',
          },
        },
      }}
    >
      <Box
        sx={(theme) => ({
          position: 'relative',
          px: 3,
          pt: 3,
          pb: 2,
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.secondary.main} 100%)`,
          color: 'white',
        })}
      >
        <IconButton
          onClick={handleClose}
          disabled={isLoading}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            color: 'white',
            bgcolor: alpha('#fff', 0.12),
            '&:hover': { bgcolor: alpha('#fff', 0.22) },
          }}
          aria-label="Fechar"
        >
          <CloseIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <CalendarMonthIcon sx={{ fontSize: 32 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
            Adicionar planilha
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.9, maxWidth: 380 }}>
          Escolha o período de referência e importe o arquivo .ods ou .xlsx do consumo material consignado.
        </Typography>
      </Box>

      <Box sx={{ px: 3, py: 3, display: 'grid', gap: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="add-planilha-mes">Mês</InputLabel>
            <Select
              labelId="add-planilha-mes"
              label="Mês"
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              disabled={isLoading}
            >
              {MESES_OPCOES.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel id="add-planilha-ano">Ano</InputLabel>
            <Select
              labelId="add-planilha-ano"
              label="Ano"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              disabled={isLoading}
            >
              {ANOS_PLANILHA_DISPONIVEIS.map((a) => (
                <MenuItem key={a} value={a}>
                  {a}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box
          sx={(theme) => ({
            p: 2.5,
            borderRadius: 3,
            border: `2px dashed ${alpha(theme.palette.primary.main, arquivo ? 0.5 : 0.25)}`,
            bgcolor: alpha(theme.palette.primary.main, arquivo ? 0.06 : 0.02),
            textAlign: 'center',
            transition: 'all 0.25s ease',
          })}
        >
          {arquivo ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
              <InsertDriveFileOutlinedIcon color="primary" sx={{ fontSize: 36 }} />
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {arquivo.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Referência: {mesModelo.label}
                </Typography>
              </Box>
            </Box>
          ) : (
            <>
              <UploadFileIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7, mb: 1 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Arquivo no formato <strong>.ods</strong> ou <strong>.xlsx</strong> — consumo material consignado
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
            size="large"
            startIcon={<UploadFileIcon />}
            onClick={() => inputRef.current?.click()}
            disabled={isLoading}
            sx={{
              mt: arquivo ? 2 : 0,
              borderRadius: 2,
              px: 3,
              fontWeight: 700,
              ...(arquivo
                ? {}
                : {
                    background: (theme) =>
                      `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    boxShadow: '0 8px 24px rgba(11, 61, 145, 0.25)',
                  }),
            }}
          >
            Selecionar planilha
          </Button>
        </Box>

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
            size="large"
            disabled={!arquivo || isLoading}
            onClick={handleConfirmar}
            startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
          >
            {isLoading ? 'Importando...' : 'Adicionar à planilha'}
          </Button>
        </Box>
      </Box>
    </Dialog>
  )
}
