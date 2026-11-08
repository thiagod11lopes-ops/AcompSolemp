import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import {
  createEmptyPacientePmeRow,
  formatPacientePmeUpper,
  PACIENTES_PME_POSTOS_GRAD,
  PACIENTES_PME_VINCULOS,
  type PacientePmeRow,
} from '@/utils/pacientesPme'

interface NovoPacientePmeModalProps {
  open: boolean
  onClose: () => void
  onAdd: (row: PacientePmeRow) => void
}

const emptyDraft = () => ({
  nome: '',
  nipUsuario: '',
  nipTitular: '',
  postoGradTitular: '',
  vinculo: '',
})

export function NovoPacientePmeModal({ open, onClose, onAdd }: NovoPacientePmeModalProps) {
  const [draft, setDraft] = useState(emptyDraft)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!open) return
    setDraft(emptyDraft())
    setErro('')
  }, [open])

  const update = (patch: Partial<typeof draft>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
    if (erro) setErro('')
  }

  const handleSubmit = () => {
    const nome = formatPacientePmeUpper(draft.nome)
    const nipUsuario = draft.nipUsuario.trim()
    if (!nome) {
      setErro('Informe o nome do paciente.')
      return
    }
    if (!nipUsuario) {
      setErro('Informe o NIP do usuário.')
      return
    }
    if (!draft.postoGradTitular) {
      setErro('Selecione o posto/graduação do titular.')
      return
    }
    if (!draft.vinculo) {
      setErro('Selecione o vínculo.')
      return
    }

    onAdd({
      ...createEmptyPacientePmeRow(),
      nome,
      nipUsuario,
      nipTitular: draft.nipTitular.trim() || nipUsuario,
      postoGradTitular: draft.postoGradTitular,
      vinculo: draft.vinculo,
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ pr: 6, fontWeight: 800 }}>
        Novo Paciente
        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Preencha os dados do paciente para o banco PME / IMH.
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 1.25,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          }}
        >
          <TextField
            label="Nome"
            value={draft.nome}
            onChange={(e) => update({ nome: formatPacientePmeUpper(e.target.value) })}
            size="small"
            fullWidth
            autoFocus
            required
            sx={{ gridColumn: { sm: '1 / -1' } }}
          />
          <TextField
            label="NIP do usuário"
            value={draft.nipUsuario}
            onChange={(e) => update({ nipUsuario: e.target.value.trim() })}
            size="small"
            fullWidth
            required
          />
          <TextField
            label="NIP do titular"
            value={draft.nipTitular}
            onChange={(e) => update({ nipTitular: e.target.value.trim() })}
            size="small"
            fullWidth
            placeholder="Igual ao usuário se vazio"
          />
          <TextField
            select
            label="Posto/Grad do titular"
            value={draft.postoGradTitular}
            onChange={(e) => update({ postoGradTitular: e.target.value })}
            size="small"
            fullWidth
            required
          >
            <MenuItem value="">
              <em>Selecione</em>
            </MenuItem>
            {PACIENTES_PME_POSTOS_GRAD.map((posto) => (
              <MenuItem key={posto} value={posto}>
                {posto}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Vínculo"
            value={draft.vinculo}
            onChange={(e) => update({ vinculo: e.target.value })}
            size="small"
            fullWidth
            required
          >
            <MenuItem value="">
              <em>Selecione</em>
            </MenuItem>
            {PACIENTES_PME_VINCULOS.map((vinculo) => (
              <MenuItem key={vinculo} value={vinculo}>
                {vinculo}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        {erro ? (
          <Typography variant="caption" color="error" sx={{ mt: 1.25, display: 'block' }}>
            {erro}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleSubmit}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Adicionar paciente
        </Button>
      </DialogActions>
    </Dialog>
  )
}
