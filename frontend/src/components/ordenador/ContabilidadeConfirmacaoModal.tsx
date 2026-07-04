import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  alpha,
  useTheme,
  Chip,
  Divider,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CalculateIcon from '@mui/icons-material/Calculate'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
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
  onConfirmar: () => void
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
  const paciente = pedido.paciente
  const dados = pedido.dadosClinica
  const material =
    dados?.materialUtilizado || pedido.material.descricao
  const valor = dados?.valorTotal ?? pedido.valor
  const dataRef = dados?.dataCirurgia || pedido.dataSolicitacao

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
              Contabilidade/IMH
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Conferência dos lançamentos
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Confira se todos os itens abaixo foram lançados corretamente antes de finalizar a etapa.
        </Typography>

        <Box
          sx={{
            p: 2.5,
            borderRadius: 3,
            mb: 2,
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
            Material e valores
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
            {dados?.procedimento && (
              <Dado label="Procedimento" value={dados.procedimento} />
            )}
            {dados?.medico && <Dado label="Médico" value={dados.medico} />}
          </Box>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            mb: 3,
            bgcolor: alpha(theme.palette.info.main, 0.08),
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800, textAlign: 'center' }}>
            Todos esses itens foram lançados corretamente?
          </Typography>
        </Box>

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
            onClick={onConfirmar}
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
