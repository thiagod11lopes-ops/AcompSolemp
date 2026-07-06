import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import AddIcon from '@mui/icons-material/Add'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { maskNip, NIP_REGEX } from '@/utils/format'
import {
  buildConsumoRowFromManual,
  CONSUMO_MATERIAL_HEADERS,
  EMPTY_MANUAL_ROW,
  MANUAL_ROW_EXAMPLE,
  type ConsumoMaterialRow,
  type ManualRowFormData,
} from '@/utils/consumoMaterialOds'

const DATA_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/

const manualSchema = z.object({
  numero: z.string(),
  postoGrad: z.string(),
  nip: z.string().min(1, 'Informe o NIP').regex(NIP_REGEX, 'Formato: 00.0000.00'),
  nome: z.string().min(1, 'Informe o nome'),
  iniciais: z.string(),
  data: z
    .string()
    .min(1, 'Informe a data')
    .regex(DATA_REGEX, 'Use o formato dd/mm/aa'),
  idade: z.string(),
  diagnostico: z.string(),
  cid: z.string(),
  procedimento: z.string().min(1, 'Informe o procedimento'),
  materiais: z.string(),
  et: z.string(),
  fornecedor: z.string().min(1, 'Informe o fornecedor'),
  cirurgiao: z.string(),
  mapaSala: z.string(),
  mapa: z.string(),
  ref: z.string(),
  safin: z.string(),
  empenho: z.string(),
  danfe: z.string(),
  valor: z.string().min(1, 'Informe o valor'),
  ata: z.string(),
})

const GROUP_ICONS = {
  paciente: PersonIcon,
  clinico: LocalHospitalIcon,
  financeiro: AttachMoneyIcon,
} as const

const GROUP_TITLES = {
  paciente: 'Paciente',
  clinico: 'Dados clínicos',
  financeiro: 'Financeiro',
} as const

interface ConsumoMaterialManualFormProps {
  nextNumero: string
  onAddRow: (row: ConsumoMaterialRow) => void
}

export function ConsumoMaterialManualForm({
  nextNumero,
  onAddRow,
}: ConsumoMaterialManualFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ManualRowFormData>({
    resolver: zodResolver(manualSchema),
    defaultValues: { ...EMPTY_MANUAL_ROW, numero: nextNumero },
  })

  useEffect(() => {
    setValue('numero', nextNumero)
  }, [nextNumero, setValue])

  const onSubmit = (data: ManualRowFormData) => {
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    onAddRow(buildConsumoRowFromManual(data, id))
    const proximoNumero = String((parseInt(data.numero, 10) || 0) + 1)
    reset({ ...EMPTY_MANUAL_ROW, numero: proximoNumero })
  }

  const preencherExemplo = () => {
    reset({ ...MANUAL_ROW_EXAMPLE, numero: nextNumero })
  }

  const fieldsByGroup = (['paciente', 'clinico', 'financeiro'] as const).map((group) => ({
    group,
    fields: CONSUMO_MATERIAL_HEADERS.filter((col) => col.group === group),
  }))

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="body1" color="text.secondary">
          Preencha os campos da planilha e adicione cada lançamento à tabela abaixo.
        </Typography>
        <Tooltip title="Preencher com dados de exemplo">
          <IconButton color="primary" onClick={preencherExemplo} aria-label="Preencher exemplo">
            <AutoAwesomeIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'grid', gap: 3 }}>
        {fieldsByGroup.map(({ group, fields }) => {
          const Icon = GROUP_ICONS[group]
          return (
            <Card key={group} variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <Icon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {GROUP_TITLES[group]}
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  {fields.map((col) => {
                    const fieldKey = col.key as keyof ManualRowFormData
                    const isNip = fieldKey === 'nip'
                    const isMultiline = ['diagnostico', 'procedimento', 'materiais', 'danfe'].includes(
                      fieldKey,
                    )

                    return (
                      <Grid
                        key={col.key}
                        size={{
                          xs: 12,
                          sm: isMultiline ? 12 : col.key === 'numero' || col.key === 'et' ? 4 : 6,
                          md: isMultiline ? 12 : col.key === 'nome' || col.key === 'procedimento' ? 8 : 4,
                        }}
                      >
                        {isNip ? (
                          <Controller
                            name="nip"
                            control={control}
                            render={({ field }) => (
                              <TextField
                                fullWidth
                                label={col.label}
                                placeholder="00.0000.00"
                                value={field.value}
                                onChange={(e) => field.onChange(maskNip(e.target.value))}
                                onBlur={field.onBlur}
                                error={Boolean(errors.nip)}
                                helperText={errors.nip?.message ?? 'Formato: 00.0000.00'}
                                slotProps={{
                                  htmlInput: { inputMode: 'numeric', maxLength: 10 },
                                }}
                              />
                            )}
                          />
                        ) : (
                          <TextField
                            fullWidth
                            label={col.label}
                            multiline={isMultiline}
                            rows={isMultiline ? 2 : undefined}
                            {...register(fieldKey)}
                            error={Boolean(errors[fieldKey])}
                            helperText={errors[fieldKey]?.message}
                            placeholder={
                              fieldKey === 'data'
                                ? 'dd/mm/aa'
                                : fieldKey === 'valor'
                                  ? 'R$ 0,00'
                                  : undefined
                            }
                          />
                        )}
                      </Grid>
                    )
                  })}
                </Grid>
              </CardContent>
            </Card>
          )
        })}
      </Box>

      <Button
        type="submit"
        variant="contained"
        size="large"
        startIcon={<AddIcon />}
        sx={{ mt: 3 }}
      >
        Adicionar à planilha
      </Button>
    </Box>
  )
}
