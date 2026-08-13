import { useEffect, useMemo, useState } from 'react'
import { Close as CloseIcon } from '@mui/icons-material'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import type { ListaMedicamentosLinha } from '@/types'
import {
  formatListaMedDataHoje,
  formatListaMedQtd,
  formatListaMedValidade,
  parseListaMedQtdNumber,
} from '@/utils/listaMedicamentosForm'

export type ListaMedMovimentacaoTipo = 'entrada' | 'saida'

export interface ListaMedicamentoMovimentacaoSubmit {
  tipo: ListaMedMovimentacaoTipo
  qtd: string
  data: string
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
  const [tipo, setTipo] = useState<ListaMedMovimentacaoTipo>('entrada')
  const [data, setData] = useState(() => formatListaMedDataHoje())
  const [qtd, setQtd] = useState('')
  const [origemDestino, setOrigemDestino] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!open) return
    setTipo('entrada')
    setData(formatListaMedDataHoje())
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

  const dataPronta = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(data.trim())

  const handleConfirm = () => {
    if (!dataPronta) {
      setErro('Informe a data da movimentação (dd/mm/aaaa).')
      return
    }
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
      data: formatListaMedValidade(data),
      origemDestino: origemDestino.trim(),
      responsavel: responsavel.trim().toUpperCase(),
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
        Movimentação de estoque
        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'grid', gap: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {linha?.medicamento?.trim() || '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {[
              linha?.lote?.trim() ? `Lote ${linha.lote.trim()}` : null,
              linha?.validade?.trim() ? `Val. ${linha.validade.trim()}` : null,
              `Estoque: ${formatEstoqueNumero(estoqueAtual)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        </Box>

        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={tipo}
          onChange={(_, next) => {
            if (!next) return
            setTipo(next)
            setErro('')
          }}
        >
          <ToggleButton value="entrada">Entrada</ToggleButton>
          <ToggleButton value="saida">Saída</ToggleButton>
        </ToggleButtonGroup>

        <TextField
          label="Data da movimentação"
          value={data}
          onChange={(e) => {
            setData(formatListaMedValidade(e.target.value))
            setErro('')
          }}
          fullWidth
          size="small"
          placeholder="dd/mm/aaaa"
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
        />

        <TextField
          label="Quantidade"
          value={qtd}
          onChange={(e) => {
            setQtd(formatListaMedQtd(e.target.value))
            setErro('')
          }}
          fullWidth
          size="small"
          autoFocus
          helperText={
            qtdNum > 0
              ? `Estoque após ${tipo === 'entrada' ? 'entrada' : 'saída'}: ${formatEstoqueNumero(estoqueApos)}`
              : undefined
          }
          slotProps={{ htmlInput: { inputMode: 'decimal' } }}
        />

        <TextField
          label={tipo === 'entrada' ? 'De onde veio' : 'Para onde vai'}
          value={origemDestino}
          onChange={(e) => {
            setOrigemDestino(e.target.value)
            setErro('')
          }}
          fullWidth
          size="small"
        />

        <TextField
          label="Responsável pela movimentação"
          value={responsavel}
          onChange={(e) => {
            setResponsavel(e.target.value.toUpperCase())
            setErro('')
          }}
          fullWidth
          size="small"
        />

        {erro ? (
          <Typography color="error" variant="body2" sx={{ fontWeight: 600 }}>
            {erro}
          </Typography>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleConfirm} sx={{ textTransform: 'none' }}>
          Confirmar {tipo === 'entrada' ? 'entrada' : 'saída'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
