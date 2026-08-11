import { useEffect, useState } from 'react'
import {
  alpha,
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import MedicationIcon from '@mui/icons-material/Medication'
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy'
import {
  createMedicamentoPrecoVazio,
  formatPrecoReferenciaMedicamento,
  MEDICAMENTOS_PRECOS_HEADERS,
  type MedicamentoPrecoRow,
} from '@/utils/medicamentosPrecos'

interface MedicamentoPrecoAddModalProps {
  open: boolean
  onClose: () => void
  onAdd: (row: MedicamentoPrecoRow) => void
}

export function MedicamentoPrecoAddModal({
  open,
  onClose,
  onAdd,
}: MedicamentoPrecoAddModalProps) {
  const theme = useTheme()
  const [neb, setNeb] = useState('')
  const [medicamento, setMedicamento] = useState('')
  const [uf, setUf] = useState('')
  const [precoReferencia, setPrecoReferencia] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!open) return
    setNeb('')
    setMedicamento('')
    setUf('')
    setPrecoReferencia('')
    setErro('')
  }, [open])

  const handleAdd = () => {
    const med = medicamento.trim()
    if (!med) {
      setErro('Informe o nome do medicamento.')
      return
    }

    onAdd({
      ...createMedicamentoPrecoVazio(),
      neb: neb.trim(),
      medicamento: med,
      uf: uf.trim().toUpperCase(),
      precoReferencia:
        formatPrecoReferenciaMedicamento(precoReferencia) || precoReferencia.trim(),
    })
  }

  const fieldSetters = {
    neb: setNeb,
    medicamento: setMedicamento,
    uf: setUf,
    precoReferencia: setPrecoReferencia,
  } as const

  const fieldValues = {
    neb,
    medicamento,
    uf,
    precoReferencia,
  } as const

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(10px)',
            backgroundColor: alpha('#06101f', 0.62),
          },
        },
        paper: {
          sx: {
            borderRadius: 5,
            overflow: 'hidden',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
            boxShadow: `0 40px 120px ${alpha('#000', 0.38)}`,
            background: theme.palette.background.paper,
          },
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          px: { xs: 2.5, sm: 3.5 },
          pt: 3.5,
          pb: 3,
          background: `radial-gradient(120% 140% at 0% 0%, ${alpha(theme.palette.primary.main, 0.28)} 0%, ${alpha(theme.palette.success.main, 0.1)} 42%, transparent 70%), linear-gradient(160deg, ${alpha(theme.palette.primary.dark, 0.14)} 0%, ${theme.palette.background.paper} 58%)`,
        }}
      >
        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pr: 5 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 3.5,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              background: `linear-gradient(145deg, ${theme.palette.primary.main} 0%, ${theme.palette.success.main} 100%)`,
              boxShadow: `0 18px 40px ${alpha(theme.palette.primary.main, 0.35)}`,
            }}
          >
            <LocalPharmacyIcon sx={{ fontSize: 32 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{
                letterSpacing: '0.14em',
                color: 'primary.main',
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              Catálogo clínico
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                mt: 0.25,
              }}
            >
              Adicionar medicamento
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              Preencha os dados e inclua o item na lista de preços de referência.
            </Typography>
          </Box>
        </Box>
      </Box>

      <DialogContent sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 2.5, pb: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            p: 2,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
            background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.background.default, 0.4)} 100%)`,
          }}
        >
          {MEDICAMENTOS_PRECOS_HEADERS.map((field) => (
            <TextField
              key={field.key}
              label={field.label}
              value={fieldValues[field.key]}
              onChange={(e) => fieldSetters[field.key](e.target.value)}
              fullWidth
              size="medium"
              autoFocus={field.key === 'medicamento'}
              required={field.key === 'medicamento'}
              placeholder={
                field.key === 'neb'
                  ? 'Ex.: 123456'
                  : field.key === 'medicamento'
                    ? 'Nome completo do medicamento'
                    : field.key === 'uf'
                      ? 'UN'
                      : '0,00'
              }
              slotProps={{
                input:
                  field.key === 'precoReferencia'
                    ? {
                        startAdornment: (
                          <InputAdornment position="start">R$</InputAdornment>
                        ),
                      }
                    : field.key === 'medicamento'
                      ? {
                          startAdornment: (
                            <InputAdornment position="start">
                              <MedicationIcon fontSize="small" color="action" />
                            </InputAdornment>
                          ),
                        }
                      : undefined,
                htmlInput:
                  field.key === 'uf'
                    ? {
                        maxLength: 4,
                        style: { textTransform: 'uppercase' },
                      }
                    : undefined,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  bgcolor: alpha(theme.palette.background.paper, 0.92),
                },
              }}
            />
          ))}
        </Box>

        {erro && (
          <Typography color="error" variant="body2" sx={{ mt: 1.75 }}>
            {erro}
          </Typography>
        )}

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1.25,
            mt: 3,
          }}
        >
          <Button onClick={onClose} color="inherit" sx={{ borderRadius: 2.5, px: 2 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            startIcon={<LocalPharmacyIcon />}
            sx={{
              borderRadius: 2.5,
              px: 2.5,
              py: 1,
              fontWeight: 700,
              boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.35)}`,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.success.dark} 100%)`,
            }}
          >
            Adicionar à planilha
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
