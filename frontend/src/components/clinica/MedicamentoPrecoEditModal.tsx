import { useEffect, useState } from 'react'
import {
  alpha,
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import EditNoteIcon from '@mui/icons-material/EditNote'
import {
  formatPrecoReferenciaMedicamento,
  MEDICAMENTOS_PRECOS_HEADERS,
  type MedicamentoPrecoRow,
} from '@/utils/medicamentosPrecos'

interface MedicamentoPrecoEditModalProps {
  open: boolean
  row: MedicamentoPrecoRow | null
  onClose: () => void
  onSave: (row: MedicamentoPrecoRow) => void
}

export function MedicamentoPrecoEditModal({
  open,
  row,
  onClose,
  onSave,
}: MedicamentoPrecoEditModalProps) {
  const theme = useTheme()
  const [neb, setNeb] = useState('')
  const [medicamento, setMedicamento] = useState('')
  const [uf, setUf] = useState('')
  const [precoReferencia, setPrecoReferencia] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!open || !row) return
    setNeb(row.neb)
    setMedicamento(row.medicamento)
    setUf(row.uf)
    setPrecoReferencia(row.precoReferencia)
    setErro('')
  }, [open, row])

  const handleSave = () => {
    if (!row) return
    const med = medicamento.trim()
    if (!med) {
      setErro('Informe o nome do medicamento.')
      return
    }
    onSave({
      ...row,
      neb: neb.trim(),
      medicamento: med,
      uf: uf.trim().toUpperCase(),
      precoReferencia:
        formatPrecoReferenciaMedicamento(precoReferencia) || precoReferencia.trim(),
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(8px)',
            backgroundColor: alpha('#0B1220', 0.5),
          },
        },
        paper: {
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            border: `1px solid ${alpha(theme.palette.success.main, 0.28)}`,
            boxShadow: `0 28px 90px ${alpha('#000', 0.32)}`,
            background: `linear-gradient(155deg, ${alpha(theme.palette.success.main, 0.12)} 0%, ${theme.palette.background.paper} 42%)`,
          },
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.success.main, 0.14),
            color: theme.palette.success.main,
            border: `1px solid ${alpha(theme.palette.success.main, 0.28)}`,
          }}
        >
          <EditNoteIcon />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, pr: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Editar medicamento
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Atualize os dados da linha e salve as alterações
          </Typography>
        </Box>
        <IconButton aria-label="Fechar" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        <Box sx={{ display: 'grid', gap: 2 }}>
          {MEDICAMENTOS_PRECOS_HEADERS.map((field) => {
            const value =
              field.key === 'neb'
                ? neb
                : field.key === 'medicamento'
                  ? medicamento
                  : field.key === 'uf'
                    ? uf
                    : precoReferencia
            const onChange =
              field.key === 'neb'
                ? setNeb
                : field.key === 'medicamento'
                  ? setMedicamento
                  : field.key === 'uf'
                    ? setUf
                    : setPrecoReferencia
            return (
              <TextField
                key={field.key}
                label={field.label}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                fullWidth
                size="medium"
                autoFocus={field.key === 'medicamento'}
                inputProps={
                  field.key === 'uf'
                    ? { maxLength: 4, style: { textTransform: 'uppercase' } }
                    : undefined
                }
              />
            )
          })}
        </Box>

        {erro && (
          <Typography color="error" variant="body2" sx={{ mt: 1.5 }}>
            {erro}
          </Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button variant="contained" color="success" onClick={handleSave}>
            Salvar alterações
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
