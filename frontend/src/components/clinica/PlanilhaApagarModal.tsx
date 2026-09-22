import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { ANOS_PLANILHA_DISPONIVEIS } from '@/utils/consumoMaterialTemplate'

const MESES_OPCOES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
] as const

export type PlanilhaApagarConfirmacao = {
  apagarTudo: boolean
  mes: number
  ano: number
}

interface PlanilhaApagarModalProps {
  open: boolean
  abaNome: string
  anosDisponiveis?: number[]
  initialMes?: number
  initialAno?: number
  onClose: () => void
  onConfirm: (opts: PlanilhaApagarConfirmacao) => void
}

export function PlanilhaApagarModal({
  open,
  abaNome,
  anosDisponiveis,
  initialMes,
  initialAno,
  onClose,
  onConfirm,
}: PlanilhaApagarModalProps) {
  const agora = useMemo(() => new Date(), [])
  const [apagarTudo, setApagarTudo] = useState(false)
  const [mes, setMes] = useState(initialMes ?? agora.getMonth() + 1)
  const [ano, setAno] = useState(initialAno ?? agora.getFullYear())

  const anos = useMemo(() => {
    const set = new Set<number>([...ANOS_PLANILHA_DISPONIVEIS, agora.getFullYear()])
    for (const a of anosDisponiveis ?? []) set.add(a)
    return [...set].sort((a, b) => b - a)
  }, [anosDisponiveis, agora])

  useEffect(() => {
    if (!open) return
    setApagarTudo(false)
    setMes(initialMes ?? agora.getMonth() + 1)
    setAno(initialAno ?? agora.getFullYear())
  }, [open, initialMes, initialAno, agora])

  const mesLabel = MESES_OPCOES.find((m) => m.value === mes)?.label ?? String(mes)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Apagar lançamentos</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Esta ação remove dados da {abaNome} e da outra aba vinculada (IMH / Div. Material), pois
          ambas são preenchidas pela mesma planilha importada. Não é possível desfazer.
        </Typography>

        <FormControlLabel
          control={
            <Checkbox
              checked={apagarTudo}
              onChange={(_, checked) => setApagarTudo(checked)}
              color="error"
            />
          }
          label="Apagar Tudo"
          sx={{ mb: 1.5, '& .MuiFormControlLabel-label': { fontWeight: 700 } }}
        />

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 140 }} disabled={apagarTudo}>
            <InputLabel id="apagar-mes-label">Mês</InputLabel>
            <Select
              labelId="apagar-mes-label"
              label="Mês"
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
            >
              {MESES_OPCOES.map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }} disabled={apagarTudo}>
            <InputLabel id="apagar-ano-label">Ano</InputLabel>
            <Select
              labelId="apagar-ano-label"
              label="Ano"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
            >
              {anos.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          {apagarTudo
            ? 'Todo o conteúdo das abas IMH e Div. Material será apagado.'
            : `Serão apagados os lançamentos de ${mesLabel}/${ano}.`}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancelar
        </Button>
        <Button
          color="error"
          variant="contained"
          sx={{ textTransform: 'none', fontWeight: 700 }}
          onClick={() => onConfirm({ apagarTudo, mes, ano })}
        >
          {apagarTudo ? 'Apagar tudo' : 'Apagar período'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
