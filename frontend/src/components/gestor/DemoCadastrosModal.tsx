import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Chip,
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
import { useClinicas, useUsuarios } from '@/hooks/useCadastros'
import { CADASTRO_PERFIS } from '@/types/cadastroPerfis'

interface DemoCadastroItem {
  id: string
  userId: string
  label: string
  nome: string
  email: string
  ativo: boolean
}

interface DemoCadastrosModalProps {
  open: boolean
  onClose: () => void
}

export function DemoCadastrosModal({ open, onClose }: DemoCadastrosModalProps) {
  const navigate = useNavigate()
  const { startDemo } = useAuth()
  const { data: usuarios = [] } = useUsuarios()
  const { data: clinicas = [] } = useClinicas()
  const [erro, setErro] = useState('')

  const itens = useMemo<DemoCadastroItem[]>(() => {
    const resultado: DemoCadastroItem[] = []

    for (const opcao of CADASTRO_PERFIS) {
      if (opcao.isClinica) {
        const usuariosClinica = usuarios.filter((u) => u.perfil === 'CLINICA')
        for (const clinica of clinicas) {
          const user =
            usuariosClinica.find((u) => u.clinicaId === clinica.id && u.email) ??
            usuariosClinica.find((u) => u.clinicaId === clinica.id)
          resultado.push({
            id: `clinica-${clinica.id}`,
            userId: user?.id ?? '',
            label: opcao.label,
            nome: clinica.nome,
            email: user?.email?.trim() || '—',
            ativo: Boolean(user?.id && user.ativo && user.email?.trim()),
          })
        }
        continue
      }

      for (const user of usuarios.filter((u) => u.perfil === opcao.perfil)) {
        resultado.push({
          id: user.id,
          userId: user.id,
          label: opcao.label,
          nome: user.nome,
          email: user.email?.trim() || '—',
          ativo: Boolean(user.ativo && user.email?.trim()),
        })
      }
    }

    return resultado
  }, [clinicas, usuarios])

  const handleSelect = async (item: DemoCadastroItem) => {
    if (!item.ativo || !item.userId) return
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
          Escolha um cadastro para simular o acesso à Timeline. As ações são reais e afetam os dados da
          organização.
        </Alert>
        {erro && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {erro}
          </Alert>
        )}

        {itens.length === 0 ? (
          <Typography color="text.secondary">Nenhum cadastro encontrado.</Typography>
        ) : (
          <List disablePadding>
            {itens.map((item) => (
              <ListItemButton
                key={item.id}
                disabled={!item.ativo}
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
                      {!item.ativo && <Chip label="Inativo" size="small" color="default" />}
                    </Box>
                  }
                  secondary={item.email}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  )
}
