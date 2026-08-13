import { useEffect, useMemo, useState } from 'react'
import {
  ArrowCircleDownOutlined as EntradaIcon,
  ArrowCircleUpOutlined as SaidaIcon,
  Close as CloseIcon,
  PersonOutlined as PersonIcon,
  PlaceOutlined as PlaceIcon,
  SwapVert as SwapIcon,
} from '@mui/icons-material'
import {
  alpha,
  Box,
  Button,
  Dialog,
  InputAdornment,
  TextField,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material'
import type { ListaMedicamentosLinha } from '@/types'
import {
  formatListaMedQtd,
  parseListaMedQtdNumber,
} from '@/utils/listaMedicamentosForm'

export type ListaMedMovimentacaoTipo = 'entrada' | 'saida'

export interface ListaMedicamentoMovimentacaoSubmit {
  tipo: ListaMedMovimentacaoTipo
  qtd: string
  origemDestino: string
  responsavel: string
}

interface ListaMedicamentoMovimentacaoModalProps {
  open: boolean
  linha: ListaMedicamentosLinha | null
  onClose: () => void
  onConfirm: (payload: ListaMedicamentoMovimentacaoSubmit) => void
}

function formatEstoqueNumero(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}

export function ListaMedicamentoMovimentacaoModal({
  open,
  linha,
  onClose,
  onConfirm,
}: ListaMedicamentoMovimentacaoModalProps) {
  const theme = useTheme()
  const [tipo, setTipo] = useState<ListaMedMovimentacaoTipo>('entrada')
  const [qtd, setQtd] = useState('')
  const [origemDestino, setOrigemDestino] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!open) return
    setTipo('entrada')
    setQtd('')
    setOrigemDestino('')
    setResponsavel('')
    setErro('')
  }, [open, linha?.id])

  const estoqueAtual = parseListaMedQtdNumber(linha?.qtd ?? '')
  const qtdNum = parseListaMedQtdNumber(qtd)
  const estoqueApos = useMemo(() => {
    if (qtdNum <= 0) return estoqueAtual
    return tipo === 'entrada' ? estoqueAtual + qtdNum : estoqueAtual - qtdNum
  }, [estoqueAtual, qtdNum, tipo])

  const accent = tipo === 'entrada' ? '#0f7a4b' : '#c2410c'
  const accentSoft = tipo === 'entrada' ? '#217346' : '#ea580c'

  const handleConfirm = () => {
    if (qtdNum <= 0) {
      setErro('Informe a quantidade da movimentação.')
      return
    }
    if (!origemDestino.trim()) {
      setErro(
        tipo === 'entrada'
          ? 'Informe de onde o medicamento veio.'
          : 'Informe para onde o medicamento vai.',
      )
      return
    }
    if (!responsavel.trim()) {
      setErro('Informe o responsável pela movimentação.')
      return
    }
    onConfirm({
      tipo,
      qtd: formatListaMedQtd(qtd) || String(qtdNum),
      origemDestino: origemDestino.trim(),
      responsavel: responsavel.trim().toUpperCase(),
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
            backdropFilter: 'blur(14px)',
            bgcolor: alpha('#041018', 0.58),
          },
        },
        paper: {
          elevation: 0,
          sx: {
            borderRadius: 4.5,
            overflow: 'hidden',
            border: `1px solid ${alpha(accent, 0.28)}`,
            boxShadow: `0 36px 110px ${alpha('#000', 0.42)}`,
            background: theme.palette.background.paper,
          },
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          px: { xs: 2.5, sm: 3.25 },
          pt: 3.25,
          pb: 2.25,
          background: `
            radial-gradient(120% 90% at 0% 0%, ${alpha(accent, 0.28)} 0%, transparent 55%),
            radial-gradient(90% 70% at 100% 10%, ${alpha(accentSoft, 0.14)} 0%, transparent 50%),
            linear-gradient(165deg, ${alpha(accent, 0.1)} 0%, ${theme.palette.background.paper} 58%)
          `,
        }}
      >
        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Box
          sx={{
            width: 58,
            height: 58,
            borderRadius: '20px',
            display: 'grid',
            placeItems: 'center',
            color: accent,
            bgcolor: alpha(accent, 0.14),
            border: `1px solid ${alpha(accent, 0.28)}`,
            mb: 1.75,
            boxShadow: `0 10px 28px ${alpha(accent, 0.18)}`,
          }}
        >
          <SwapIcon sx={{ fontSize: 30 }} />
        </Box>

        <Typography
          sx={{
            fontWeight: 900,
            fontSize: '1.28rem',
            letterSpacing: '-0.045em',
            lineHeight: 1.15,
          }}
        >
          Movimentação de estoque
        </Typography>
        <Typography
          sx={{ mt: 0.85, fontSize: '0.88rem', lineHeight: 1.5, color: 'text.secondary', maxWidth: 440 }}
        >
          Registre a entrada ou saída deste medicamento, com origem/destino e o responsável.
        </Typography>

        <Box
          sx={{
            mt: 2,
            px: 1.5,
            py: 1.2,
            borderRadius: 2.5,
            border: `1px solid ${alpha(theme.palette.divider, 0.95)}`,
            bgcolor: alpha('#fff', 0.72),
            backdropFilter: 'blur(6px)',
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 800, letterSpacing: 0.7, color: 'text.secondary' }}
          >
            MEDICAMENTO
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', mt: 0.2 }}>
            {linha?.medicamento?.trim() || '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>
            {[
              linha?.lote?.trim() ? `Lote ${linha.lote.trim()}` : null,
              linha?.validade?.trim() ? `Val. ${linha.validade.trim()}` : null,
              `Estoque atual: ${formatEstoqueNumero(estoqueAtual)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2.5, sm: 3.25 }, pt: 0.5, pb: 1, display: 'grid', gap: 1.5 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1,
            p: 0.55,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.common.black, 0.035),
            border: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
          }}
        >
          {(
            [
              { id: 'entrada' as const, label: 'Entrada', icon: <EntradaIcon sx={{ fontSize: 20 }} /> },
              { id: 'saida' as const, label: 'Saída', icon: <SaidaIcon sx={{ fontSize: 20 }} /> },
            ] as const
          ).map((opt) => {
            const active = tipo === opt.id
            const color = opt.id === 'entrada' ? '#0f7a4b' : '#c2410c'
            return (
              <Button
                key={opt.id}
                onClick={() => {
                  setTipo(opt.id)
                  setErro('')
                }}
                startIcon={opt.icon}
                sx={{
                  textTransform: 'none',
                  fontWeight: 800,
                  borderRadius: 2.4,
                  py: 1.15,
                  color: active ? '#fff' : 'text.secondary',
                  bgcolor: active ? color : 'transparent',
                  boxShadow: active ? `0 10px 24px ${alpha(color, 0.35)}` : 'none',
                  '&:hover': {
                    bgcolor: active ? color : alpha(color, 0.08),
                  },
                }}
              >
                {opt.label}
              </Button>
            )
          })}
        </Box>

        <TextField
          label="Quantidade"
          value={qtd}
          onChange={(e) => {
            setQtd(formatListaMedQtd(e.target.value))
            setErro('')
          }}
          fullWidth
          autoFocus
          helperText={
            qtdNum > 0
              ? `Estoque após ${tipo === 'entrada' ? 'entrada' : 'saída'}: ${formatEstoqueNumero(estoqueApos)}`
              : ' '
          }
          slotProps={{
            htmlInput: { inputMode: 'decimal' },
            formHelperText: {
              sx: {
                fontWeight: 700,
                color:
                  qtdNum > 0 && estoqueApos < 0
                    ? 'error.main'
                    : qtdNum > 0
                      ? accent
                      : 'text.secondary',
              },
            },
          }}
        />

        <TextField
          label={tipo === 'entrada' ? 'De onde veio' : 'Para onde vai'}
          value={origemDestino}
          onChange={(e) => {
            setOrigemDestino(e.target.value)
            setErro('')
          }}
          fullWidth
          placeholder={
            tipo === 'entrada'
              ? 'Ex.: Farmácia Central, doação, transferência…'
              : 'Ex.: Setor Cirúrgico, paciente, transferência…'
          }
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <PlaceIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            },
          }}
        />

        <TextField
          label="Responsável pela movimentação"
          value={responsavel}
          onChange={(e) => {
            setResponsavel(e.target.value.toUpperCase())
            setErro('')
          }}
          fullWidth
          placeholder="Nome completo"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            },
          }}
        />

        {erro ? (
          <Typography sx={{ color: 'error.main', fontWeight: 700, fontSize: '0.82rem' }}>
            {erro}
          </Typography>
        ) : null}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 0.85,
          }}
        >
          {[
            { label: 'Atual', value: formatEstoqueNumero(estoqueAtual) },
            {
              label: tipo === 'entrada' ? '+ Entrada' : '− Saída',
              value: qtdNum > 0 ? formatEstoqueNumero(qtdNum) : '—',
            },
            {
              label: 'Após',
              value: qtdNum > 0 ? formatEstoqueNumero(estoqueApos) : '—',
              highlight: qtdNum > 0,
            },
          ].map((item) => (
            <Box
              key={item.label}
              sx={{
                px: 1,
                py: 1.05,
                borderRadius: 2.2,
                textAlign: 'center',
                border: `1px solid ${
                  item.highlight ? alpha(accent, 0.4) : alpha(theme.palette.divider, 0.9)
                }`,
                bgcolor: item.highlight
                  ? alpha(accent, 0.08)
                  : alpha(theme.palette.common.black, 0.02),
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.65rem' }}
              >
                {item.label}
              </Typography>
              <Typography
                sx={{
                  mt: 0.25,
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  letterSpacing: '-0.03em',
                  color:
                    item.highlight && estoqueApos < 0
                      ? 'error.main'
                      : item.highlight
                        ? accent
                        : 'text.primary',
                }}
              >
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          px: { xs: 2.5, sm: 3.25 },
          pb: 2.75,
          pt: 1.25,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Button variant="text" onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: 2.2,
            px: 2.25,
            bgcolor: accent,
            boxShadow: `0 12px 28px ${alpha(accent, 0.35)}`,
            '&:hover': { bgcolor: accentSoft },
          }}
        >
          Confirmar {tipo === 'entrada' ? 'entrada' : 'saída'}
        </Button>
      </Box>
    </Dialog>
  )
}
