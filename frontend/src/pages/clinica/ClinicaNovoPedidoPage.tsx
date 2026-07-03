import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Alert,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PersonIcon from '@mui/icons-material/Person'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { useCreateClinicaPedido } from '@/hooks/useClinicaPedidos'
import { useClinicas } from '@/hooks/useCadastros'
import { useClinicaAuth } from '@/contexts/AuthContext'
import type { PacienteVinculo, TipoUsuarioPaciente } from '@/types'
import { formatNip, maskNip, NIP_REGEX } from '@/utils/format'

const TIPO_USUARIO_OPTIONS: { value: TipoUsuarioPaciente; label: string }[] = [
  { value: 'MILITAR', label: 'Militar' },
  { value: 'MILITAR_DA_RESERVA', label: 'Militar da Reserva' },
  { value: 'MILITAR_RESERVADO', label: 'Militar Reformado' },
  { value: 'DEPENDENTE_DIRETO', label: 'Dependente Direto' },
  { value: 'DEPENDENTE_INDIRETO', label: 'Dependente Indireto' },
  { value: 'PENSIONISTA', label: 'Pensionista' },
]

const TIPOS_MILITARES: TipoUsuarioPaciente[] = [
  'MILITAR',
  'MILITAR_DA_RESERVA',
  'MILITAR_RESERVADO',
]

const TIPOS_DEPENDENTES: TipoUsuarioPaciente[] = [
  'DEPENDENTE_DIRETO',
  'DEPENDENTE_INDIRETO',
  'PENSIONISTA',
]

function isTipoUsuarioBloqueado(
  tipo: TipoUsuarioPaciente,
  vinculo: PacienteVinculo,
): boolean {
  if (vinculo === 'DEPENDENTE') return TIPOS_MILITARES.includes(tipo)
  return TIPOS_DEPENDENTES.includes(tipo)
}

const schema = z
  .object({
    nome: z.string().min(1, 'Informe o nome'),
    vinculo: z.enum(['TITULAR', 'DEPENDENTE'], {
      message: 'Informe se é Titular ou Dependente',
    }),
    nip: z
      .string()
      .min(1, 'Informe o NIP')
      .regex(NIP_REGEX, 'NIP deve estar no formato 00.0000.00'),
    nipTitular: z.string(),
    nomeTitular: z.string(),
    tipoUsuario: z.enum(
      [
        'MILITAR',
        'MILITAR_DA_RESERVA',
        'MILITAR_RESERVADO',
        'DEPENDENTE_DIRETO',
        'DEPENDENTE_INDIRETO',
        'PENSIONISTA',
      ],
      { message: 'Selecione o tipo de usuário' },
    ),
    nomeClinica: z.string().min(1, 'Informe o nome da clínica'),
    medico: z.string().min(1, 'Informe o médico'),
    procedimento: z.string().min(1, 'Informe o procedimento'),
    dataCirurgia: z.string().min(1, 'Informe a data da cirurgia'),
    empresaConsignada: z.string().min(1, 'Informe a empresa consignada'),
    pregao: z.string().min(1, 'Informe o pregão'),
    materialUtilizado: z.string().min(1, 'Informe o material utilizado'),
    quantidade: z.number({ message: 'Informe a quantidade' }).min(1, 'Informe a quantidade'),
    valorUnitario: z
      .number({ message: 'Informe o valor unitário' })
      .min(0.01, 'Informe o valor unitário'),
    valorTotal: z.number({ message: 'Informe o valor total' }).min(0.01, 'Informe o valor total'),
    folhaSala: z.array(z.string()),
    descricaoCirurgica: z.array(z.string()),
    etiquetas: z.array(z.string()),
    fotos: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (data.vinculo === 'DEPENDENTE') {
      if (!data.nipTitular.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe o NIP do titular',
          path: ['nipTitular'],
        })
      } else if (!NIP_REGEX.test(data.nipTitular)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'NIP do titular deve estar no formato 00.0000.00',
          path: ['nipTitular'],
        })
      }
      if (!data.nomeTitular.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe o nome do titular',
          path: ['nomeTitular'],
        })
      }
    }
    if (isTipoUsuarioBloqueado(data.tipoUsuario, data.vinculo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tipo de usuário incompatível com o vínculo selecionado',
        path: ['tipoUsuario'],
      })
    }
  })

type FormData = z.infer<typeof schema>

function CampoAnexo({
  label,
  accept,
  multiple = true,
  value,
  onChange,
}: {
  label: string
  accept: string
  multiple?: boolean
  value: string[]
  onChange: (names: string[]) => void
}) {
  return (
    <Box>
      <Button
        variant="outlined"
        component="label"
        fullWidth
        startIcon={<AttachFileIcon />}
        sx={{ justifyContent: 'flex-start', py: 1.5, textTransform: 'none' }}
      >
        {label}
        <input
          type="file"
          hidden
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            onChange(files.map((f) => f.name))
          }}
        />
      </Button>
      {value.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
          {value.map((nome) => (
            <Chip key={nome} label={nome} size="small" variant="outlined" />
          ))}
        </Box>
      )}
    </Box>
  )
}

function CampoNaoSeAplica({
  active,
  label,
  children,
}: {
  active: boolean
  label: string
  children: ReactNode
}) {
  return (
    <Box>
      <Typography
        variant="body2"
        component="label"
        sx={{
          display: 'block',
          mb: 0.75,
          fontWeight: 500,
          color: 'text.primary',
        }}
      >
        {label}
      </Typography>
      <Box sx={{ position: 'relative' }}>
        <Box
          sx={{
            pointerEvents: active ? 'none' : 'auto',
            '& .MuiOutlinedInput-root': active
              ? { bgcolor: 'action.hover' }
              : undefined,
          }}
        >
          {children}
        </Box>
        {active && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              borderRadius: 1,
              opacity: 1,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
              Não se Aplica
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default function ClinicaNovoPedidoPage() {
  const navigate = useNavigate()
  const createPedido = useCreateClinicaPedido()
  const { user } = useClinicaAuth()
  const { data: clinicas = [] } = useClinicas()
  const clinicaLogada = clinicas.find((c) => c.id === user?.clinicaId)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '',
      vinculo: 'TITULAR',
      nip: '',
      nipTitular: '',
      nomeTitular: '',
      tipoUsuario: 'MILITAR',
      nomeClinica: '',
      medico: '',
      procedimento: '',
      dataCirurgia: '',
      empresaConsignada: '',
      pregao: '',
      materialUtilizado: '',
      quantidade: 1,
      valorUnitario: 0,
      valorTotal: 0,
      folhaSala: [],
      descricaoCirurgica: [],
      etiquetas: [],
      fotos: [],
    },
  })

  const vinculo = useWatch({ control, name: 'vinculo' })
  const tipoUsuarioAtual = useWatch({ control, name: 'tipoUsuario' })
  const quantidade = useWatch({ control, name: 'quantidade' })
  const valorUnitario = useWatch({ control, name: 'valorUnitario' })
  const isTitular = vinculo === 'TITULAR'

  useEffect(() => {
    if (clinicaLogada?.nome) {
      setValue('nomeClinica', clinicaLogada.nome)
    }
  }, [clinicaLogada?.nome, setValue])

  useEffect(() => {
    if (isTitular) {
      setValue('nipTitular', '')
      setValue('nomeTitular', '')
    }
  }, [isTitular, setValue])

  useEffect(() => {
    if (isTipoUsuarioBloqueado(tipoUsuarioAtual, vinculo)) {
      setValue(
        'tipoUsuario',
        vinculo === 'TITULAR' ? 'MILITAR' : 'DEPENDENTE_DIRETO',
        { shouldValidate: true },
      )
    }
  }, [vinculo, tipoUsuarioAtual, setValue])

  useEffect(() => {
    const qtd = Number(quantidade) || 0
    const unitario = Number(valorUnitario) || 0
    const total = Math.round(qtd * unitario * 100) / 100
    setValue('valorTotal', total)
  }, [quantidade, valorUnitario, setValue])

  const setVinculo = (value: PacienteVinculo) => {
    setValue('vinculo', value, { shouldValidate: true })
    setValue('nipTitular', '')
    setValue('nomeTitular', '')
    setValue(
      'tipoUsuario',
      value === 'TITULAR' ? 'MILITAR' : 'DEPENDENTE_DIRETO',
      { shouldValidate: true },
    )
  }

  const onSubmit = async (data: FormData) => {
    try {
      const pedido = await createPedido.mutateAsync({
        paciente: {
          nome: data.nome.trim(),
          vinculo: data.vinculo,
          nip: formatNip(data.nip.trim()),
          nipTitular: formatNip(isTitular ? data.nip.trim() : data.nipTitular.trim()),
          nomeTitular: isTitular ? data.nome.trim() : data.nomeTitular.trim(),
          tipoUsuario: data.tipoUsuario,
        },
        dadosClinica: {
          nomeClinica: data.nomeClinica.trim(),
          medico: data.medico.trim(),
          procedimento: data.procedimento.trim(),
          dataCirurgia: data.dataCirurgia,
          empresaConsignada: data.empresaConsignada.trim(),
          pregao: data.pregao.trim(),
          materialUtilizado: data.materialUtilizado.trim(),
          quantidade: data.quantidade,
          valorUnitario: data.valorUnitario,
          valorTotal: data.valorTotal,
          folhaSala: data.folhaSala,
          descricaoCirurgica: data.descricaoCirurgica,
          etiquetas: data.etiquetas,
          fotos: data.fotos,
        },
      })
      navigate(`/clinica/timeline/${pedido.id}`)
    } catch {
      // mutation error handled below
    }
  }

  return (
    <>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/clinica/pedidos')}
        sx={{ mb: 2 }}
      >
        Voltar
      </Button>

      <PageHeader
        title="Novo Lançamento"
        subtitle="Informe os dados do paciente e da clínica para iniciar a timeline"
      />

      {createPedido.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erro ao criar lançamento. Tente novamente.
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Box sx={{ display: 'grid', gap: 3, maxWidth: 800 }}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <PersonIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Paciente
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Nome"
                    {...register('nome')}
                    error={Boolean(errors.nome)}
                    helperText={errors.nome?.message}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <FormControl error={Boolean(errors.vinculo)} component="fieldset">
                    <FormLabel component="legend">Vínculo</FormLabel>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={vinculo === 'TITULAR'}
                            onChange={() => setVinculo('TITULAR')}
                          />
                        }
                        label="Titular"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={vinculo === 'DEPENDENTE'}
                            onChange={() => setVinculo('DEPENDENTE')}
                          />
                        }
                        label="Dependente"
                      />
                    </Box>
                    {errors.vinculo && (
                      <FormHelperText>{errors.vinculo.message}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="nip"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        fullWidth
                        label="NIP"
                        placeholder="00.0000.00"
                        value={field.value}
                        onChange={(e) => field.onChange(maskNip(e.target.value))}
                        onBlur={field.onBlur}
                        slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
                        error={Boolean(errors.nip)}
                        helperText={errors.nip?.message ?? 'Formato: 00.0000.00'}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <CampoNaoSeAplica active={isTitular} label="NIP do titular">
                    <Controller
                      name="nipTitular"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          fullWidth
                          placeholder="00.0000.00"
                          value={field.value}
                          onChange={(e) => field.onChange(maskNip(e.target.value))}
                          onBlur={field.onBlur}
                          disabled={isTitular}
                          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
                          error={Boolean(errors.nipTitular)}
                          helperText={
                            isTitular
                              ? undefined
                              : (errors.nipTitular?.message ?? 'Formato: 00.0000.00')
                          }
                        />
                      )}
                    />
                  </CampoNaoSeAplica>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <CampoNaoSeAplica active={isTitular} label="Nome do titular">
                    <TextField
                      fullWidth
                      {...register('nomeTitular')}
                      disabled={isTitular}
                      error={Boolean(errors.nomeTitular)}
                      helperText={isTitular ? undefined : errors.nomeTitular?.message}
                    />
                  </CampoNaoSeAplica>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="tipoUsuario"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth error={Boolean(errors.tipoUsuario)}>
                        <InputLabel id="tipo-usuario-label">Tipo de usuário</InputLabel>
                        <Select
                          labelId="tipo-usuario-label"
                          label="Tipo de usuário"
                          value={field.value}
                          onChange={field.onChange}
                        >
                          {TIPO_USUARIO_OPTIONS.map((opt) => {
                            const bloqueado = isTipoUsuarioBloqueado(opt.value, vinculo)
                            return (
                              <MenuItem
                                key={opt.value}
                                value={opt.value}
                                disabled={bloqueado}
                                sx={{
                                  '&.Mui-disabled': {
                                    color: 'error.main',
                                    opacity: '1 !important',
                                    fontWeight: 600,
                                  },
                                }}
                              >
                                {opt.label}
                              </MenuItem>
                            )
                          })}
                        </Select>
                        {errors.tipoUsuario && (
                          <FormHelperText>{errors.tipoUsuario.message}</FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <LocalHospitalIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Clínica
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Nome da Clínica"
                    {...register('nomeClinica')}
                    error={Boolean(errors.nomeClinica)}
                    helperText={errors.nomeClinica?.message}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Médico"
                    {...register('medico')}
                    error={Boolean(errors.medico)}
                    helperText={errors.medico?.message}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Procedimento"
                    {...register('procedimento')}
                    error={Boolean(errors.procedimento)}
                    helperText={errors.procedimento?.message}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Data da Cirurgia"
                    {...register('dataCirurgia')}
                    error={Boolean(errors.dataCirurgia)}
                    helperText={errors.dataCirurgia?.message}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Empresa consignada"
                    {...register('empresaConsignada')}
                    error={Boolean(errors.empresaConsignada)}
                    helperText={errors.empresaConsignada?.message}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Pregão"
                    {...register('pregao')}
                    error={Boolean(errors.pregao)}
                    helperText={errors.pregao?.message}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Material Utilizado"
                    {...register('materialUtilizado')}
                    error={Boolean(errors.materialUtilizado)}
                    helperText={errors.materialUtilizado?.message}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Quantidade"
                    {...register('quantidade', { valueAsNumber: true })}
                    error={Boolean(errors.quantidade)}
                    helperText={errors.quantidade?.message}
                    slotProps={{ htmlInput: { min: 1, step: 1 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Valor Unitário"
                    {...register('valorUnitario', { valueAsNumber: true })}
                    error={Boolean(errors.valorUnitario)}
                    helperText={errors.valorUnitario?.message}
                    slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Valor Total"
                    {...register('valorTotal', { valueAsNumber: true })}
                    error={Boolean(errors.valorTotal)}
                    helperText={errors.valorTotal?.message ?? 'Calculado automaticamente'}
                    slotProps={{ htmlInput: { min: 0, step: '0.01', readOnly: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="folhaSala"
                    control={control}
                    render={({ field }) => (
                      <CampoAnexo
                        label="Folha da Sala"
                        accept=".pdf,.doc,.docx,image/*"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="descricaoCirurgica"
                    control={control}
                    render={({ field }) => (
                      <CampoAnexo
                        label="Descrição Cirúrgica"
                        accept=".pdf,.doc,.docx,image/*"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="etiquetas"
                    control={control}
                    render={({ field }) => (
                      <CampoAnexo
                        label="Etiquetas"
                        accept=".pdf,image/*"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="fotos"
                    control={control}
                    render={({ field }) => (
                      <CampoAnexo
                        label="Fotos"
                        accept="image/*"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>

        <Button
          type="submit"
          variant="contained"
          size="large"
          sx={{ mt: 3 }}
          disabled={createPedido.isPending}
        >
          {createPedido.isPending ? 'Enviando...' : 'Enviar Para Material'}
        </Button>
      </Box>
    </>
  )
}
