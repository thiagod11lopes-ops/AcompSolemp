import { Box, Divider, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import type { PedidoComDetalhes } from '@/types'
import { EnvioFluxoDialog } from '@/components/common/EnvioFluxoDialog'
import { formatCurrency, formatDate, formatNip } from '@/utils/format'

const TIPO_USUARIO_LABEL: Record<string, string> = {
  MILITAR: 'Militar',
  MILITAR_DA_RESERVA: 'Militar da Reserva',
  MILITAR_RESERVADO: 'Militar Reformado',
  DEPENDENTE_DIRETO: 'Dependente Direto',
  DEPENDENTE_INDIRETO: 'Dependente Indireto',
  PENSIONISTA: 'Pensionista',
}

interface ContabilidadeConfirmacaoModalProps {
  open: boolean
  onClose: () => void
  onConfirmar: (anotacoes: string) => void
  loading?: boolean
  pedido: PedidoComDetalhes
}

function Dado({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'grid', gap: 0.15 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value || '—'}
      </Typography>
    </Box>
  )
}

export function ContabilidadeConfirmacaoModal({
  open,
  onClose,
  onConfirmar,
  loading = false,
  pedido,
}: ContabilidadeConfirmacaoModalProps) {
  const [anotacoes, setAnotacoes] = useState('')
  const paciente = pedido.paciente
  const dados = pedido.dadosClinica
  const material = dados?.materialUtilizado || pedido.material.descricao
  const valor = dados?.valorTotal ?? pedido.valor
  const dataRef = dados?.dataCirurgia || pedido.dataSolicitacao

  useEffect(() => {
    if (open) setAnotacoes('')
  }, [open])

  return (
    <EnvioFluxoDialog
      open={open}
      title="Finalizar IMH"
      onClose={onClose}
      onSubmit={() => onConfirmar(anotacoes.trim())}
      loading={loading}
      loadingLabel="Finalizando..."
      submitLabel="Sim, finalizar"
      cancelLabel="Não"
      hideSubmitIcon
      maxWidth="sm"
      chips={[
        { label: pedido.numero, color: 'primary' },
        { label: 'IMH', color: 'warning' },
      ]}
    >
      <Box
        sx={{
          mb: 1.5,
          p: 1.25,
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(85, 139, 113, 0.06)',
          display: 'grid',
          gap: 1.25,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          Paciente
        </Typography>
        {paciente ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1,
            }}
          >
            <Dado label="Nome" value={paciente.nome} />
            <Dado
              label="Vínculo"
              value={paciente.vinculo === 'TITULAR' ? 'Titular' : 'Dependente'}
            />
            <Dado label="NIP" value={formatNip(paciente.nip)} />
            <Dado label="NIP do titular" value={formatNip(paciente.nipTitular)} />
            <Dado label="Nome do titular" value={paciente.nomeTitular} />
            <Dado
              label="Tipo de usuário"
              value={TIPO_USUARIO_LABEL[paciente.tipoUsuario] ?? paciente.tipoUsuario}
            />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Dados do paciente não informados neste lançamento.
          </Typography>
        )}

        <Divider />

        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          Material, valor e data
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1,
          }}
        >
          <Dado label="Material" value={material} />
          {dados?.quantidade != null && (
            <Dado label="Quantidade" value={String(dados.quantidade)} />
          )}
          <Dado label="Valor" value={formatCurrency(valor)} />
          <Dado label="Data" value={formatDate(dataRef)} />
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
        Verifique se todos os itens foram cadastrados corretamente.
      </Typography>

      <TextField
        fullWidth
        size="small"
        label="Comentários"
        placeholder="Opcional — aparece na aba lateral da timeline com o seu nome"
        value={anotacoes}
        onChange={(e) => setAnotacoes(e.target.value)}
        disabled={loading}
        multiline
        minRows={2}
      />
    </EnvioFluxoDialog>
  )
}
