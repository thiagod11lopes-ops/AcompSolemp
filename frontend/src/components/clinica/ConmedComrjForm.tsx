import { Add as AddIcon, DeleteOutlined as DeleteIcon } from '@mui/icons-material'
import { Box, Button, IconButton, Paper, TextField, Typography, alpha } from '@mui/material'
import type { ConmedComrjFormData, ConmedComrjMaterialItem } from '@/types'
import {
  createEmptyConmedMaterialItem,
  formatConmedData,
  formatConmedMoeda,
  formatConmedNebPi,
  formatConmedNumero,
  formatConmedNumerico,
  formatConmedPacienteNip,
  formatConmedPregaoTad,
  formatConmedProcesso,
  formatConmedQuantidade,
  formatConmedUppercase,
  withRecalculatedMateriais,
} from '@/utils/conmedComrjForm'

interface ConmedComrjFormProps {
  value: ConmedComrjFormData
  onChange: (next: ConmedComrjFormData) => void
}

export function ConmedComrjForm({ value, onChange }: ConmedComrjFormProps) {
  const setField = <K extends keyof ConmedComrjFormData>(
    key: K,
    fieldValue: ConmedComrjFormData[K],
  ) => {
    onChange({ ...value, [key]: fieldValue })
  }

  const updateMaterial = (
    id: string,
    patch: Partial<Omit<ConmedComrjMaterialItem, 'id' | 'valorTotal'>>,
  ) => {
    const materiais = value.materiais.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    )
    onChange({ ...value, ...withRecalculatedMateriais(materiais) })
  }

  const addMaterial = () => {
    onChange({
      ...value,
      ...withRecalculatedMateriais([...value.materiais, createEmptyConmedMaterialItem()]),
    })
  }

  const removeMaterial = (id: string) => {
    const remaining =
      value.materiais.length <= 1
        ? [createEmptyConmedMaterialItem()]
        : value.materiais.filter((item) => item.id !== id)
    onChange({ ...value, ...withRecalculatedMateriais(remaining) })
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
          Preencha os dados do processo, do paciente e do material. Esta aba não é uma planilha.
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

      <Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            mb: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            DADOS DO MATERIAL
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addMaterial}
          >
            Adicionar material
          </Button>
        </Box>

        <Box sx={{ display: 'grid', gap: 2 }}>
          {value.materiais.map((mat, index) => (
            <Paper
              key={mat.id}
              variant="outlined"
              sx={{
                p: 2,
                display: 'grid',
                gap: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Material {index + 1}
                </Typography>
                <IconButton
                  size="small"
                  aria-label={`Remover material ${index + 1}`}
                  onClick={() => removeMaterial(mat.id)}
                  disabled={value.materiais.length <= 1 && !mat.mapaDaSala && !mat.descricao}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: '1fr 1fr',
                    md: '1fr 1fr 1fr',
                  },
                }}
              >
                <TextField
                  label="MAPA DA SALA"
                  value={mat.mapaDaSala}
                  onChange={(e) =>
                    updateMaterial(mat.id, {
                      mapaDaSala: formatConmedNumerico(e.target.value),
                    })
                  }
                  placeholder="Somente números"
                  helperText="Formato numérico"
                  size="small"
                  fullWidth
                  inputMode="numeric"
                />
                <TextField
                  label="DANFE"
                  value={mat.danfe}
                  onChange={(e) =>
                    updateMaterial(mat.id, { danfe: formatConmedNumerico(e.target.value) })
                  }
                  placeholder="Somente números"
                  helperText="Formato numérico"
                  size="small"
                  fullWidth
                  inputMode="numeric"
                />
                <TextField
                  label="ITEM"
                  value={mat.item}
                  onChange={(e) =>
                    updateMaterial(mat.id, { item: formatConmedNumerico(e.target.value) })
                  }
                  placeholder="Somente números"
                  helperText="Formato numérico"
                  size="small"
                  fullWidth
                  inputMode="numeric"
                />
                <TextField
                  label="NEB/PI"
                  value={mat.nebPi}
                  onChange={(e) =>
                    updateMaterial(mat.id, { nebPi: formatConmedNebPi(e.target.value) })
                  }
                  placeholder="123 ou ABC"
                  helperText="Numérico ou letras maiúsculas"
                  size="small"
                  fullWidth
                  slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
                />
                <TextField
                  label="DESCRIÇÃO DO MATERIAL"
                  value={mat.descricao}
                  onChange={(e) =>
                    updateMaterial(mat.id, {
                      descricao: formatConmedUppercase(e.target.value),
                    })
                  }
                  placeholder="DESCRIÇÃO"
                  helperText="Letras maiúsculas"
                  size="small"
                  fullWidth
                  sx={{ gridColumn: { md: 'span 2' } }}
                  slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
                />
                <TextField
                  label="QT"
                  value={mat.qt}
                  onChange={(e) =>
                    updateMaterial(mat.id, { qt: formatConmedQuantidade(e.target.value) })
                  }
                  placeholder="0"
                  helperText="Formato numérico"
                  size="small"
                  fullWidth
                  inputMode="decimal"
                />
                <TextField
                  label="VALOR UNIT"
                  value={mat.valorUnit}
                  onChange={(e) =>
                    updateMaterial(mat.id, { valorUnit: formatConmedMoeda(e.target.value) })
                  }
                  placeholder="R$ 0,00"
                  helperText="Moeda real (R$)"
                  size="small"
                  fullWidth
                  inputMode="numeric"
                />
                <TextField
                  label="VALOR TOTAL"
                  value={mat.valorTotal}
                  helperText="QT × VALOR UNIT (automático)"
                  size="small"
                  fullWidth
                  slotProps={{ input: { readOnly: true } }}
                />
              </Box>
            </Paper>
          ))}

          <TextField
            label="VALOR POR PACIENTE"
            value={value.valorPorPaciente}
            helperText="Soma automática dos valores totais deste paciente"
            size="small"
            fullWidth
            slotProps={{ input: { readOnly: true } }}
            sx={{ maxWidth: { md: 360 } }}
          />
        </Box>
      </Box>
    </Paper>
  )
}
