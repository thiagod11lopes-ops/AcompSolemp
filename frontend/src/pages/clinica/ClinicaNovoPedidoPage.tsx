import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
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
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { useCreateClinicaPedido } from '@/hooks/useClinicaPedidos'
import type { PacienteVinculo, TipoUsuarioPaciente } from '@/types'

const TIPO_USUARIO_OPTIONS: { value: TipoUsuarioPaciente; label: string }[] = [
  { value: 'MILITAR', label: 'Militar' },
  { value: 'DEPENDENTE_DIRETO', label: 'Dependente Direto' },
  { value: 'DEPENDENTE_INDIRETO', label: 'Dependente Indireto' },
  { value: 'PENSIONISTA', label: 'Pensionista' },
]

const schema = z
  .object({
    nome: z.string().min(1, 'Informe o nome'),
    vinculo: z.enum(['TITULAR', 'DEPENDENTE'], {
      message: 'Informe se é Titular ou Dependente',
    }),
    nip: z.string().min(1, 'Informe o NIP'),
    nipTitular: z.string(),
    nomeTitular: z.string(),
    tipoUsuario: z.enum(
      ['MILITAR', 'DEPENDENTE_DIRETO', 'DEPENDENTE_INDIRETO', 'PENSIONISTA'],
      { message: 'Selecione o tipo de usuário' },
    ),
  })
  .superRefine((data, ctx) => {
    if (data.vinculo === 'DEPENDENTE') {
      if (!data.nipTitular.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe o NIP do titular',
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
  })

type FormData = z.infer<typeof schema>

export default function ClinicaNovoPedidoPage() {
  const navigate = useNavigate()
  const createPedido = useCreateClinicaPedido()

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
    },
  })

  const vinculo = useWatch({ control, name: 'vinculo' })
  const nome = useWatch({ control, name: 'nome' })
  const nip = useWatch({ control, name: 'nip' })
  const isTitular = vinculo === 'TITULAR'

  useEffect(() => {
    if (isTitular) {
      setValue('nipTitular', nip)
      setValue('nomeTitular', nome)
    }
  }, [isTitular, nome, nip, setValue])

  const setVinculo = (value: PacienteVinculo) => {
    setValue('vinculo', value, { shouldValidate: true })
    if (value === 'TITULAR') {
      setValue('nipTitular', nip)
      setValue('nomeTitular', nome)
    } else {
      setValue('nipTitular', '')
      setValue('nomeTitular', '')
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      const pedido = await createPedido.mutateAsync({
        paciente: {
          nome: data.nome.trim(),
          vinculo: data.vinculo,
          nip: data.nip.trim(),
          nipTitular: isTitular ? data.nip.trim() : data.nipTitular.trim(),
          nomeTitular: isTitular ? data.nome.trim() : data.nomeTitular.trim(),
          tipoUsuario: data.tipoUsuario,
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
        subtitle="Informe os dados do paciente para iniciar a timeline"
      />

      {createPedido.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erro ao criar lançamento. Tente novamente.
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card variant="outlined" sx={{ borderRadius: 3, maxWidth: 720 }}>
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
                <TextField
                  fullWidth
                  label="NIP"
                  {...register('nip')}
                  error={Boolean(errors.nip)}
                  helperText={errors.nip?.message}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="NIP do titular"
                  {...register('nipTitular')}
                  disabled={isTitular}
                  error={Boolean(errors.nipTitular)}
                  helperText={
                    errors.nipTitular?.message ??
                    (isTitular ? 'Preenchido automaticamente para titular' : undefined)
                  }
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Nome do titular"
                  {...register('nomeTitular')}
                  disabled={isTitular}
                  error={Boolean(errors.nomeTitular)}
                  helperText={
                    errors.nomeTitular?.message ??
                    (isTitular ? 'Preenchido automaticamente para titular' : undefined)
                  }
                />
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
                        {TIPO_USUARIO_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
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

        <Button
          type="submit"
          variant="contained"
          size="large"
          sx={{ mt: 3 }}
          disabled={createPedido.isPending}
        >
          {createPedido.isPending ? 'Salvando...' : 'Criar Lançamento'}
        </Button>
      </Box>
    </>
  )
}
