import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  alpha,
  useTheme,
  Chip,
  Divider,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CalculateIcon from '@mui/icons-material/Calculate'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import NotesIcon from '@mui/icons-material/Notes'
import { useEffect, useState } from 'react'
import type { PedidoComDetalhes } from '@/types'
import { formatCurrency, formatDate, formatNip } from '@/utils/format'

const TIPO_USUARIO_LABEL: Record<string, string> = {
  MILITAR: 'Militar',
  MILITAR_DA_RESERVA: 'Militar da Reserva',
  MILITAR_RESERVADO: 'Militar Reformado',
  DEPENDENTE_DIRETO: 'Dependente Direto',
  DEPENDENTE_INDIRETO: 'Dependente Indireto',
  PENSIONISTA: 'Pensionista',
}

interface ContabilidadeConfirmacaoModalProps {
  open: boolean
  onClose: () => void
  onConfirmar: (anotacoes: string) => void
  loading?: boolean
  pedido: PedidoComDetalhes
}

function Dado({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'grid', gap: 0.25 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value || '—'}
      </Typography>
    </Box>
  )
}

export function ContabilidadeConfirmacaoModal({
  open,
  onClose,
  onConfirmar,
  loading = false,
  pedido,
}: ContabilidadeConfirmacaoModalProps) {
  const theme = useTheme()
  const [anotacoes, setAnotacoes] = useState('')
  const paciente = pedido.paciente
  const dados = pedido.dadosClinica
  const material = dados?.materialUtilizado || pedido.material.descricao
  const valor = dados?.valorTotal ?? pedido.valor
  const dataRef = dados?.dataCirurgia || pedido.dataSolicitacao

  useEffect(() => {
    if (open) setAnotacoes('')
  }, [open])

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
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
            border: `1px solid ${alpha(theme.palette.warning.main, 0.28)}`,
            background: `
              radial-gradient(120% 80% at 0% 0%, ${alpha(theme.palette.warning.main, 0.2)} 0%, transparent 55%),
              radial-gradient(100% 70% at 100% 100%, ${alpha(theme.palette.primary.main, 0.14)} 0%, transparent 50%),
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
              background: `linear-gradient(145deg, ${theme.palette.warning.main}, ${theme.palette.primary.main})`,
              color: '#fff',
              boxShadow: `0 12px 28px ${alpha(theme.palette.warning.main, 0.45)}`,
            }}
          >
            <CalculateIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
              Conclusão de Contabilidade/IMH
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Finalizar Contabilidade/IMH
            </Typography>
            <Chip
              label={pedido.numero}
              size="small"
              color="warning"
              variant="outlined"
              sx={{ mt: 1, fontWeight: 600 }}
            />
          </Box>
        </Box>
        <IconButton onClick={onClose} disabled={loading} size="small" aria-label="Fechar">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pb: 3, pt: 0 }}>
        <Box
          sx={{
            p: 2.5,
            borderRadius: 3,
            mb: 2.5,
            bgcolor: alpha(theme.palette.warning.main, 0.06),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.18)}`,
            display: 'grid',
            gap: 2,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'warning.dark' }}>
            Paciente
          </Typography>
          {paciente ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 1.5,
              }}
            >
              <Dado label="Nome" value={paciente.nome} />
              <Dado
                label="Vínculo"
                value={paciente.vinculo === 'TITULAR' ? 'Titular' : 'Dependente'}
              />
              <Dado label="NIP" value={formatNip(paciente.nip)} />
              <Dado label="NIP do titular" value={formatNip(paciente.nipTitular)} />
              <Dado label="Nome do titular" value={paciente.nomeTitular} />
              <Dado
                label="Tipo de usuário"
                value={TIPO_USUARIO_LABEL[paciente.tipoUsuario] ?? paciente.tipoUsuario}
              />
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Dados do paciente não informados neste lançamento.
            </Typography>
          )}

          <Divider />

          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'warning.dark' }}>
            Material, valor e data
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1.5,
            }}
          >
            <Dado label="Material" value={material} />
            {dados?.quantidade != null && (
              <Dado label="Quantidade" value={String(dados.quantidade)} />
            )}
            <Dado label="Valor" value={formatCurrency(valor)} />
            <Dado label="Data" value={formatDate(dataRef)} />
          </Box>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            mb: 1.5,
            bgcolor: alpha(theme.palette.info.main, 0.08),
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800, textAlign: 'center' }}>
            Verifique se todos os itens foram cadastrados corretamente.
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Anotações são opcionais. Se quiser, registre observações ao concluir a Contabilidade/IMH.
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <NotesIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Anotações
          </Typography>
          <Chip label="Opcional" size="small" variant="outlined" sx={{ height: 22 }} />
        </Box>

        <TextField
          fullWidth
          multiline
          minRows={4}
          maxRows={8}
          value={anotacoes}
          onChange={(e) => setAnotacoes(e.target.value)}
          placeholder="Escreva anotações da Contabilidade/IMH, se necessário…"
          disabled={loading}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: alpha(theme.palette.background.default, 0.65),
            },
          }}
        />

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5,
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            onClick={onClose}
            disabled={loading}
            startIcon={<CancelIcon />}
            sx={{ borderRadius: 3, py: 1.25, fontWeight: 700 }}
          >
            Não
          </Button>
          <Button
            fullWidth
            variant="contained"
            color="success"
            onClick={() => onConfirmar(anotacoes.trim())}
            disabled={loading}
            startIcon={<CheckCircleIcon />}
            sx={{
              borderRadius: 3,
              py: 1.25,
              fontWeight: 700,
              boxShadow: `0 12px 28px ${alpha(theme.palette.success.main, 0.35)}`,
            }}
          >
            {loading ? 'Finalizando...' : 'Sim, finalizar'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
