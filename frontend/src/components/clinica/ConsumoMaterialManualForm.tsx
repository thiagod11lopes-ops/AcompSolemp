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
import MedicationIcon from '@mui/icons-material/Medication'
import BadgeIcon from '@mui/icons-material/Badge'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import AddIcon from '@mui/icons-material/Add'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useMemo } from 'react'
import { maskNip, NIP_REGEX } from '@/utils/format'
import {
  buildConsumoRowFromManual,
  CONSUMO_MATERIAL_HEADERS,
  CONSUMO_MEDICAMENTO_PME_HEADERS,
  EMPTY_MANUAL_ROW,
  MANUAL_ROW_EXAMPLE,
  MANUAL_ROW_EXAMPLE_MEDICAMENTO,
  type ConsumoMaterialRow,
  type ManualRowFormData,
} from '@/utils/consumoMaterialOds'

const DATA_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/

const manualSchemaClinica = z.object({
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
  itemPme: z.string(),
  qtd: z.string(),
  valorUnitario: z.string(),
  nipTitular: z.string(),
  vinculo: z.string(),
  pctIndenizar: z.string(),
  om: z.string(),
  unidadeFornecimento: z.string(),
  quantidadeAdquirida: z.string(),
  maneiraDispensacao: z.string(),
})

const manualSchemaMedicamento = z.object({
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
  procedimento: z.string(),
  materiais: z.string(),
  et: z.string(),
  fornecedor: z.string(),
  cirurgiao: z.string(),
  mapaSala: z.string(),
  mapa: z.string(),
  ref: z.string(),
  safin: z.string(),
  empenho: z.string(),
  danfe: z.string(),
  valor: z.string(),
  ata: z.string(),
  itemPme: z.string().min(1, 'Informe o item (PME)'),
  qtd: z.string().min(1, 'Informe a quantidade'),
  valorUnitario: z.string().min(1, 'Informe o valor unitário'),
  nipTitular: z.string(),
  vinculo: z.string(),
  pctIndenizar: z.string(),
  om: z.string(),
  unidadeFornecimento: z.string(),
  quantidadeAdquirida: z.string(),
  maneiraDispensacao: z.string(),
})

const GROUP_ICONS = {
  paciente: PersonIcon,
  clinico: LocalHospitalIcon,
  financeiro: AttachMoneyIcon,
  medicamento: MedicationIcon,
  titular: BadgeIcon,
  imh: AccountBalanceIcon,
} as const

const GROUP_TITLES = {
  paciente: 'Paciente',
  clinico: 'Dados clínicos',
  financeiro: 'Financeiro',
  medicamento: 'Medicamento',
  titular: 'Titular',
  imh: 'IMH / Fornecimento',
} as const

type FormGroup = keyof typeof GROUP_TITLES

const GROUPS_CLINICA: FormGroup[] = ['paciente', 'clinico', 'financeiro']
const GROUPS_MEDICAMENTO: FormGroup[] = ['paciente', 'medicamento', 'titular', 'imh']

const MULTILINE_FIELDS = new Set([
  'diagnostico',
  'procedimento',
  'materiais',
  'danfe',
  'itemPme',
  'maneiraDispensacao',
])

const NIP_FIELDS = new Set(['nip', 'nipTitular'])

interface ConsumoMaterialManualFormProps {
  nextNumero: string
  onAddRow: (row: ConsumoMaterialRow) => void
  modoMedicamento?: boolean
}

export function ConsumoMaterialManualForm({
  nextNumero,
  onAddRow,
  modoMedicamento = false,
}: ConsumoMaterialManualFormProps) {
  const schema = modoMedicamento ? manualSchemaMedicamento : manualSchemaClinica
  const headers = modoMedicamento ? CONSUMO_MEDICAMENTO_PME_HEADERS : CONSUMO_MATERIAL_HEADERS
  const groups = modoMedicamento ? GROUPS_MEDICAMENTO : GROUPS_CLINICA
  const example = modoMedicamento ? MANUAL_ROW_EXAMPLE_MEDICAMENTO : MANUAL_ROW_EXAMPLE

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ManualRowFormData>({
    resolver: zodResolver(schema),
    defaultValues: { ...EMPTY_MANUAL_ROW, numero: nextNumero },
  })

  useEffect(() => {
    setValue('numero', nextNumero)
  }, [nextNumero, setValue])

  useEffect(() => {
    reset({ ...EMPTY_MANUAL_ROW, numero: nextNumero })
  }, [modoMedicamento, nextNumero, reset])

  const onSubmit = (data: ManualRowFormData) => {
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    onAddRow(buildConsumoRowFromManual(data, id))
    const proximoNumero = String((parseInt(data.numero, 10) || 0) + 1)
    reset({ ...EMPTY_MANUAL_ROW, numero: proximoNumero })
  }

  const preencherExemplo = () => {
    reset({ ...example, numero: nextNumero })
  }

  const fieldsByGroup = useMemo(
    () =>
      groups.map((group) => ({
        group,
        fields: headers.filter((col) => col.group === group),
      })),
    [groups, headers],
  )

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="body1" color="text.secondary">
          {modoMedicamento
            ? 'Preencha os campos do Modelo IHM — PME e adicione cada lançamento à tabela abaixo.'
            : 'Preencha os campos da planilha e adicione cada lançamento à tabela abaixo.'}
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
                    const isNip = NIP_FIELDS.has(fieldKey)
                    const isMultiline = MULTILINE_FIELDS.has(fieldKey)
                    const wideField =
                      fieldKey === 'nome' ||
                      fieldKey === 'procedimento' ||
                      fieldKey === 'itemPme' ||
                      fieldKey === 'maneiraDispensacao'

                    return (
                      <Grid
                        key={col.key}
                        size={{
                          xs: 12,
                          sm: isMultiline ? 12 : col.key === 'numero' || col.key === 'et' || col.key === 'qtd' ? 4 : 6,
                          md: isMultiline ? 12 : wideField ? 8 : 4,
                        }}
                      >
                        {isNip ? (
                          <Controller
                            name={fieldKey}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                fullWidth
                                label={col.label}
                                placeholder="00.0000.00"
                                value={field.value}
                                onChange={(e) => field.onChange(maskNip(e.target.value))}
                                onBlur={field.onBlur}
                                error={Boolean(errors[fieldKey])}
                                helperText={
                                  errors[fieldKey]?.message ?? 'Formato: 00.0000.00'
                                }
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
                                : fieldKey === 'valor' || fieldKey === 'valorUnitario'
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
