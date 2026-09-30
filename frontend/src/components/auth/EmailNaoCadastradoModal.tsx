import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded'
import { Box, Typography } from '@mui/material'
import { EnvioFluxoDialog } from '@/components/common/EnvioFluxoDialog'

interface EmailNaoCadastradoModalProps {
  open: boolean
  email: string
  onCadastrar: () => void
  onCancelar: () => void
}

/** Modal quando o e-mail digitado no login ainda não existe no sistema. */
export function EmailNaoCadastradoModal({
  open,
  email,
  onCadastrar,
  onCancelar,
}: EmailNaoCadastradoModalProps) {
  return (
    <EnvioFluxoDialog
      open={open}
      title="E-mail não cadastrado"
      onClose={onCancelar}
      onCancel={onCancelar}
      onSubmit={onCadastrar}
      cancelLabel="Cancelar"
      submitLabel="Cadastrar"
      submitStartIcon={<PersonAddAlt1RoundedIcon />}
      chips={[{ label: 'Novo acesso', color: 'warning' }]}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Este e-mail ainda não está cadastrado no sistema. Para criar sua conta,
        use <strong>Cadastrar</strong> e defina uma senha.
      </Typography>

      <Box
        sx={{
          px: 1.25,
          py: 1,
          borderRadius: '10px',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: 'text.secondary',
            mb: 0.25,
          }}
        >
          E-mail informado
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'break-all' }}>
          {email || '—'}
        </Typography>
      </Box>
    </EnvioFluxoDialog>
  )
}
