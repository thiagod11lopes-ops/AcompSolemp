import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ScienceIcon from '@mui/icons-material/Science'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  buildDemoCadastroItens,
  ensureDemoExampleCadastros,
  type DemoCadastroItem,
} from '@/services/demoCadastrosService'

interface DemoCadastrosModalProps {
  open: boolean
  onClose: () => void
}

export function DemoCadastrosModal({ open, onClose }: DemoCadastrosModalProps) {
  const navigate = useNavigate()
  const { startDemo } = useAuth()
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [itens, setItens] = useState<DemoCadastroItem[]>([])

  useEffect(() => {
    if (!open) return

    let ativo = true
    setCarregando(true)
    setErro('')

    void ensureDemoExampleCadastros()
      .then(() => {
        if (!ativo) return
        setItens(buildDemoCadastroItens())
      })
      .catch((error) => {
        if (!ativo) return
        setErro(
          error instanceof Error
            ? error.message
            : 'Não foi possível preparar os cadastros de exemplo',
        )
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [open])

  const handleSelect = async (item: DemoCadastroItem) => {
    setErro('')
    try {
      const { route } = await startDemo(item.userId)
      onClose()
      navigate(route)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível iniciar a demonstração')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
        <ScienceIcon color="primary" />
        Demonstração da Timeline
        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          Escolha uma clínica ou setor para testar a Timeline sem senha. Os cadastros de exemplo são
          criados automaticamente e as ações afetam os dados reais da organização.
        </Alert>
        {erro && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {erro}
          </Alert>
        )}

        {carregando ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : itens.length === 0 ? (
          <Typography color="text.secondary">Nenhum cadastro de exemplo disponível.</Typography>
        ) : (
          <List disablePadding>
            {itens.map((item) => (
              <ListItemButton
                key={item.id}
                onClick={() => void handleSelect(item)}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography component="span" sx={{ fontWeight: 600 }}>
                        {item.nome}
                      </Typography>
                      <Chip label={item.label} size="small" variant="outlined" />
                      {item.isExemplo && (
                        <Chip label="Exemplo" size="small" color="primary" variant="outlined" />
                      )}
                    </Box>
                  }
                  secondary={item.subtitulo}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  )
}
