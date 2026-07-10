import {
  Autocomplete,
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
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useMemo } from 'react'
import { maskNip, NIP_REGEX } from '@/utils/format'
import {
  buildConsumoRowFromManual,
  CONSUMO_MATERIAL_HEADERS,
  CONSUMO_MEDICAMENTO_PME_HEADERS,
  EMPTY_MANUAL_ROW,
  formatValorBrasileiro,
  MANUAL_ROW_EXAMPLE,
  MANUAL_ROW_EXAMPLE_MEDICAMENTO,
  parseValorBrasileiro,
  type ConsumoMaterialRow,
  type ManualRowFormData,
} from '@/utils/consumoMaterialOds'
import {
  findMedicamentoPrecoByNome,
  formatPrecoReferenciaMedicamento,
  getMedicamentosPrecosCatalog,
  type MedicamentoPrecoRow,
} from '@/utils/medicamentosPrecos'

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
  itemPme: z.string().min(1, 'Selecione o medicamento'),
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
  'maneiraDispensacao',
])

const NIP_FIELDS = new Set(['nip', 'nipTitular'])

function calcTotalFromQtdAndUnit(qtdRaw: string, unitRaw: string): string {
  const qtd = parseFloat(qtdRaw.replace(',', '.')) || 0
  const unit = parseValorBrasileiro(unitRaw)
  if (qtd <= 0 || unit <= 0) return ''
  return formatValorBrasileiro(qtd * unit)
}

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

  const medicamentosCatalog = useMemo(
    () => (modoMedicamento ? getMedicamentosPrecosCatalog() : []),
    [modoMedicamento],
  )

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ManualRowFormData>({
    resolver: zodResolver(schema),
    defaultValues: { ...EMPTY_MANUAL_ROW, numero: nextNumero },
  })

  const formValues = useWatch({ control })
  const qtdWatch = formValues.qtd
  const valorUnitarioWatch = formValues.valorUnitario

  useEffect(() => {
    setValue('numero', nextNumero)
  }, [nextNumero, setValue])

  useEffect(() => {
    reset({ ...EMPTY_MANUAL_ROW, numero: nextNumero })
  }, [modoMedicamento, nextNumero, reset])

  useEffect(() => {
    if (!modoMedicamento) return
    const total = calcTotalFromQtdAndUnit(qtdWatch ?? '', valorUnitarioWatch ?? '')
    if (total) {
      setValue('valor', total, { shouldValidate: true, shouldDirty: true })
    }
  }, [modoMedicamento, qtdWatch, valorUnitarioWatch, setValue])

  const applyMedicamentoSelection = (row: MedicamentoPrecoRow | null) => {
    if (!row) {
      setValue('itemPme', '', { shouldValidate: true, shouldDirty: true })
      return
    }
    const unitario = formatPrecoReferenciaMedicamento(row.precoReferencia)
    const qtdAtual = getValues('qtd') || '1'
    setValue('itemPme', row.medicamento, { shouldValidate: true, shouldDirty: true })
    setValue('valorUnitario', unitario, { shouldValidate: true, shouldDirty: true })
    if (!getValues('qtd')) {
      setValue('qtd', '1', { shouldValidate: true, shouldDirty: true })
    }
    if (row.uf && !getValues('unidadeFornecimento')) {
      setValue('unidadeFornecimento', row.uf, { shouldValidate: true, shouldDirty: true })
    }
    const total = calcTotalFromQtdAndUnit(qtdAtual, unitario)
    if (total) setValue('valor', total, { shouldValidate: true, shouldDirty: true })
  }

  const onSubmit = (data: ManualRowFormData) => {
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    onAddRow(buildConsumoRowFromManual(data, id))
    const proximoNumero = String((parseInt(data.numero, 10) || 0) + 1)
    reset({ ...EMPTY_MANUAL_ROW, numero: proximoNumero })
  }

  const preencherExemplo = () => {
    const exemplo = { ...example, numero: nextNumero }
    if (modoMedicamento) {
      const match =
        findMedicamentoPrecoByNome(exemplo.itemPme, medicamentosCatalog) ??
        medicamentosCatalog[0]
      if (match) {
        exemplo.itemPme = match.medicamento
        exemplo.valorUnitario = formatPrecoReferenciaMedicamento(match.precoReferencia)
        exemplo.qtd = exemplo.qtd || '1'
        exemplo.valor =
          calcTotalFromQtdAndUnit(exemplo.qtd, exemplo.valorUnitario) || exemplo.valor
        if (match.uf) exemplo.unidadeFornecimento = match.uf
      }
    }
    reset(exemplo)
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
                    const isItemPme = modoMedicamento && fieldKey === 'itemPme'
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
                          sm: isMultiline || isItemPme
                            ? 12
                            : col.key === 'numero' || col.key === 'et' || col.key === 'qtd'
                              ? 4
                              : 6,
                          md: isMultiline || isItemPme ? 12 : wideField ? 8 : 4,
                        }}
                      >
                        {isItemPme ? (
                          <Controller
                            name="itemPme"
                            control={control}
                            render={({ field }) => {
                              const selected =
                                findMedicamentoPrecoByNome(field.value, medicamentosCatalog) ??
                                null
                              return (
                                <Autocomplete
                                  options={medicamentosCatalog}
                                  value={selected}
                                  getOptionLabel={(option) =>
                                    typeof option === 'string' ? option : option.medicamento
                                  }
                                  isOptionEqualToValue={(option, value) =>
                                    option.id === value.id
                                  }
                                  filterOptions={(options, state) => {
                                    const q = state.inputValue.trim().toLowerCase()
                                    if (!q) return options
                                    return options.filter(
                                      (opt) =>
                                        opt.medicamento.toLowerCase().includes(q) ||
                                        opt.neb.toLowerCase().includes(q),
                                    )
                                  }}
                                  onChange={(_, newValue) => {
                                    applyMedicamentoSelection(newValue)
                                    field.onBlur()
                                  }}
                                  onBlur={field.onBlur}
                                  renderOption={(props, option) => (
                                    <li {...props} key={option.id}>
                                      <Box sx={{ display: 'flex', flexDirection: 'column', py: 0.5 }}>
                                        <Typography variant="body2">{option.medicamento}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {option.neb}
                                          {option.uf ? ` · ${option.uf}` : ''}
                                          {' · '}
                                          {formatPrecoReferenciaMedicamento(option.precoReferencia)}
                                        </Typography>
                                      </Box>
                                    </li>
                                  )}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label={col.label}
                                      placeholder="Busque pelo nome do medicamento"
                                      error={Boolean(errors.itemPme)}
                                      helperText={
                                        errors.itemPme?.message ??
                                        'Opções da aba Preço de Medicamentos'
                                      }
                                      slotProps={{
                                        inputLabel: { shrink: Boolean(selected) },
                                      }}
                                    />
                                  )}
                                />
                              )
                            }}
                          />
                        ) : isNip ? (
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
                                  inputLabel: { shrink: Boolean(String(field.value ?? '').trim()) },
                                }}
                              />
                            )}
                          />
                        ) : (
                          <Controller
                            name={fieldKey}
                            control={control}
                            render={({ field }) => {
                              const hasValue = Boolean(String(field.value ?? '').trim())
                              return (
                                <TextField
                                  fullWidth
                                  label={col.label}
                                  multiline={isMultiline}
                                  rows={isMultiline ? 2 : undefined}
                                  name={field.name}
                                  value={field.value ?? ''}
                                  onChange={field.onChange}
                                  onBlur={field.onBlur}
                                  inputRef={field.ref}
                                  error={Boolean(errors[fieldKey])}
                                  helperText={
                                    errors[fieldKey]?.message ??
                                    (modoMedicamento && fieldKey === 'valorUnitario'
                                      ? 'Preenchido pelo preço referência da lista'
                                      : undefined)
                                  }
                                  placeholder={
                                    fieldKey === 'data'
                                      ? 'dd/mm/aa'
                                      : fieldKey === 'valor' || fieldKey === 'valorUnitario'
                                        ? 'R$ 0,00'
                                        : undefined
                                  }
                                  slotProps={{
                                    inputLabel: { shrink: hasValue || undefined },
                                  }}
                                />
                              )
                            }}
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
