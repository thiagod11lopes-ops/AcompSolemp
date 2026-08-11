import { Box, Paper, TextField, Typography, alpha } from '@mui/material'
import type { ConmedComrjFormData } from '@/types'
import {
  formatConmedData,
  formatConmedNumero,
  formatConmedPacienteNip,
  formatConmedPregaoTad,
  formatConmedProcesso,
  formatConmedUppercase,
} from '@/utils/conmedComrjForm'

interface ConmedComrjFormProps {
  value: ConmedComrjFormData
  onChange: (next: ConmedComrjFormData) => void
}

export function ConmedComrjForm({ value, onChange }: ConmedComrjFormProps) {
  const setField = <K extends keyof ConmedComrjFormData>(key: K, fieldValue: string) => {
    onChange({ ...value, [key]: fieldValue })
  }

  return (
    <Paper
      elevation={0}
      sx={(theme) => ({
        p: { xs: 2, md: 3 },
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
        bgcolor: alpha(theme.palette.primary.main, 0.02),
        display: 'grid',
        gap: 3,
      })}
    >
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          CONMED COMRJ
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Preencha os dados do processo e do paciente. Esta aba não é uma planilha.
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Dados do processo
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          }}
        >
          <TextField
            label="Nº"
            value={value.numero}
            onChange={(e) => setField('numero', formatConmedNumero(e.target.value))}
            placeholder="25/2026"
            helperText='Formato: "25/2026"'
            size="small"
            fullWidth
          />
          <TextField
            label="DATA"
            value={value.data}
            onChange={(e) => setField('data', formatConmedData(e.target.value))}
            placeholder="dd/mm/aaaa"
            helperText="Formato: dd/mm/aaaa"
            size="small"
            fullWidth
          />
          <TextField
            label="PROCESSO"
            value={value.processo}
            onChange={(e) => setField('processo', formatConmedProcesso(e.target.value))}
            placeholder="Somente números"
            helperText="Formato numérico"
            size="small"
            fullWidth
            inputMode="numeric"
          />
          <TextField
            label="Pregão/TAD"
            value={value.pregaoTad}
            onChange={(e) => setField('pregaoTad', formatConmedPregaoTad(e.target.value))}
            placeholder="58/2025 COMRJ"
            helperText='Formato: "58/2025 COMRJ"'
            size="small"
            fullWidth
          />
          <TextField
            label="Vigência"
            value={value.vigencia}
            onChange={(e) => setField('vigencia', e.target.value)}
            placeholder="Texto livre"
            helperText="Formato editável livre"
            size="small"
            fullWidth
            sx={{ gridColumn: { md: '1 / -1' } }}
          />
          <TextField
            label="FORNECEDOR"
            value={value.fornecedor}
            onChange={(e) => setField('fornecedor', e.target.value)}
            placeholder="CONMED –  23.351.545/0003-00"
            helperText='Formato: "CONMED –  23.351.545/0003-00"'
            size="small"
            fullWidth
            sx={{ gridColumn: { md: '1 / -1' } }}
          />
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          DADOS DO PACIENTE
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          }}
        >
          <TextField
            label="NIP"
            value={value.pacienteNip}
            onChange={(e) => setField('pacienteNip', formatConmedPacienteNip(e.target.value))}
            placeholder="00.0000.00"
            helperText='Formato: "00.0000.00"'
            size="small"
            fullWidth
            inputMode="numeric"
          />
          <TextField
            label="INICIAIS"
            value={value.pacienteIniciais}
            onChange={(e) => setField('pacienteIniciais', formatConmedUppercase(e.target.value))}
            placeholder="ABC"
            helperText="Letras maiúsculas"
            size="small"
            fullWidth
            slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
          />
          <TextField
            label="Data"
            value={value.pacienteData}
            onChange={(e) => setField('pacienteData', formatConmedData(e.target.value))}
            placeholder="dd/mm/aaaa"
            helperText="Formato: dd/mm/aaaa"
            size="small"
            fullWidth
          />
          <TextField
            label="PROCEDIMENTO"
            value={value.pacienteProcedimento}
            onChange={(e) =>
              setField('pacienteProcedimento', formatConmedUppercase(e.target.value))
            }
            placeholder="PROCEDIMENTO"
            helperText="Letras maiúsculas"
            size="small"
            fullWidth
            slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
          />
        </Box>
      </Box>
    </Paper>
  )
}
