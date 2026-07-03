import {
  Box,
  Button,
  Grid,
  TextField,
  Alert,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { CreatableAutocomplete } from '@/components/common/CreatableAutocomplete'
import { useEmpresas, useMateriais } from '@/hooks/useCadastros'
import { useCreateClinicaPedido } from '@/hooks/useClinicaPedidos'
import { cadastroService } from '@/services/cadastroService'

const schema = z.object({
  empresa: z.string().min(1, 'Informe a empresa fornecedora'),
  material: z.string().min(1, 'Informe o material'),
  quantidade: z.number().min(1, 'Informe a quantidade'),
  valor: z.number().min(0.01, 'Informe o valor'),
  observacoes: z.string(),
})

type FormData = z.infer<typeof schema>

export default function ClinicaNovoPedidoPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: empresas = [], isLoading: loadingEmpresas } = useEmpresas()
  const { data: materiais = [], isLoading: loadingMateriais } = useMateriais()
  const createPedido = useCreateClinicaPedido()

  const empresaOptions = empresas.map((e) => e.nomeFantasia)
  const materialOptions = materiais.map((m) =>
    m.unidade ? `${m.descricao} (${m.unidade})` : m.descricao,
  )

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { empresa: '', material: '', quantidade: 1, valor: 0, observacoes: '' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      const empresa = await cadastroService.findOrCreateEmpresaByNome(data.empresa)
      const material = await cadastroService.findOrCreateMaterialByDescricao(data.material)

      await queryClient.invalidateQueries({ queryKey: ['empresas'] })
      await queryClient.invalidateQueries({ queryKey: ['materiais'] })

      const pedido = await createPedido.mutateAsync({
        empresaId: empresa.id,
        materialId: material.id,
        quantidade: data.quantidade,
        valor: data.valor,
        observacoes: data.observacoes,
      })
      navigate(`/clinica/timeline/${pedido.id}`)
    } catch {
      // mutation error handled below
    }
  }

  if (loadingEmpresas || loadingMateriais) return <LoadingSpinner />

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
        title="Novo Pedido de Material"
        subtitle="Solicite material consignado — ao clicar em Solicitar Material uma nova timeline será iniciada"
      />

      {createPedido.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erro ao criar pedido. Tente novamente.
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="empresa"
              control={control}
              render={({ field }) => (
                <CreatableAutocomplete
                  label="Empresa fornecedora"
                  options={empresaOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={Boolean(errors.empresa)}
                  helperText={
                    errors.empresa?.message ??
                    'Digite ou selecione — novos nomes ficam salvos para uso futuro'
                  }
                  placeholder="Ex.: Ortomed Distribuidora"
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Controller
              name="material"
              control={control}
              render={({ field }) => (
                <CreatableAutocomplete
                  label="Material"
                  options={materialOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={Boolean(errors.material)}
                  helperText={
                    errors.material?.message ??
                    'Digite ou selecione — use "(UN)" no final para definir a unidade'
                  }
                  placeholder="Ex.: Placa bloqueada 4,5mm (UN)"
                />
              )}
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
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Valor (R$)"
              slotProps={{ htmlInput: { step: '0.01' } }}
              {...register('valor', { valueAsNumber: true })}
              error={Boolean(errors.valor)}
              helperText={errors.valor?.message}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Observações"
              {...register('observacoes')}
            />
          </Grid>
        </Grid>

        <Button
          type="submit"
          variant="contained"
          size="large"
          sx={{ mt: 3 }}
          disabled={createPedido.isPending}
        >
          {createPedido.isPending ? 'Solicitando...' : 'Solicitar Material'}
        </Button>
      </Box>
    </>
  )
}
