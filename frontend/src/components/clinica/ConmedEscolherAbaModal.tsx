import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'

interface ConmedEscolherAbaModalProps {
  open: boolean
  sheetNames: string[]
  fileName?: string
  title?: string
  description?: string
  onCancel: () => void
  onConfirm: (sheetIndex: number) => void
}

export function ConmedEscolherAbaModal({
  open,
  sheetNames,
  fileName,
  title = 'Escolher aba para importar',
  description,
  onCancel,
  onConfirm,
}: ConmedEscolherAbaModalProps) {
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    if (open) setSelected(0)
  }, [open, sheetNames])

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 1.5, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {description ??
            `O arquivo${fileName ? ` “${fileName}”` : ''} tem várias abas. Selecione qual deve ser importada.`}
        </Typography>
        <FormControl fullWidth size="small">
          <InputLabel id="planilha-aba-import-label">Aba</InputLabel>
          <Select
            labelId="planilha-aba-import-label"
            label="Aba"
            value={selected}
            onChange={(e) => setSelected(Number(e.target.value))}
          >
            {sheetNames.map((nome, index) => (
              <MenuItem key={`${nome}-${index}`} value={index}>
                {nome || `Aba ${index + 1}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel}>Cancelar</Button>
        <Button variant="contained" onClick={() => onConfirm(selected)}>
          Importar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
