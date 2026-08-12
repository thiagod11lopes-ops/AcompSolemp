import {
  AutoAwesome as AutoAwesomeIcon,
  Close as CloseIcon,
  Inventory2Outlined as InventoryIcon,
  LocalPharmacyOutlined as PharmacyIcon,
  SendOutlined as SendIcon,
  TimelineOutlined as TimelineIcon,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Chip,
  Dialog,
  IconButton,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'

interface MedicamentoAbasExplicacaoModalProps {
  open: boolean
  onClose: () => void
}

const IMH_PASSOS = [
  {
    titulo: 'Preencher o lançamento',
    texto:
      'Informe DATA, NIP ou nome do paciente e o medicamento (ITEM PME). O NIP busca automaticamente na aba Pacientes: se o usuário for o titular, NIP e NIP TITULAR ficam iguais; se for dependente, o titular vem da planilha. NIP inexistente mostra o alerta “NIP NÃO ENCONTRADO NO SISTEMA”.',
  },
  {
    titulo: 'Adicionar na planilha',
    texto:
      'Ao clicar em Adicionar lançamento, a linha entra na planilha à direita. A QTD do mesmo medicamento é descontada na Lista de Medicamentos. Se o NIP for novo, ele é cadastrado em Pacientes para os próximos preenchimentos.',
  },
  {
    titulo: 'Filtrar por mês vigente',
    texto:
      'A planilha abre sempre no mês e ano atuais. Use os filtros Mês e Ano para ver só os lançamentos daquele período (pela coluna DATA).',
  },
  {
    titulo: 'Enviar para a timeline',
    texto:
      'Marque a coluna IMH (à esquerda da DATA), como o checklist do Consumo Material. O botão Enviar para IMH cria o processo e leva a planilha direto ao card Contabilidade/IMH na timeline. Linhas já enviadas ficam com o checklist cinza.',
  },
]

const LISTA_PASSOS = [
  {
    titulo: 'Catálogo e estoque',
    texto:
      'Cadastre NEB, nome do medicamento, UF, QTD em estoque, limiar de Estoque Baixo e preço de referência. Esse catálogo alimenta a busca e o preço unitário no formulário do IMH.',
  },
  {
    titulo: 'Alertas visuais',
    texto:
      'QTD igual a zero deixa a linha vermelha. QTD menor ou igual ao Estoque Baixo deixa a linha laranja. Os chips acima da tabela filtram só laranja ou só vermelho.',
  },
  {
    titulo: 'Baixa e devolução automática',
    texto:
      'Cada lançamento no IMH reduz a QTD do medicamento correspondente. Excluir o lançamento no IMH devolve essa quantidade ao estoque.',
  },
]

function PassoCard({
  index,
  titulo,
  texto,
  accent,
}: {
  index: number
  titulo: string
  texto: string
  accent: string
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 1.25,
        p: 1.5,
        borderRadius: 2.5,
        bgcolor: alpha('#fff', 0.04),
        border: `1px solid ${alpha('#fff', 0.08)}`,
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          fontSize: 12,
          fontWeight: 800,
          color: '#0b1220',
          bgcolor: accent,
          mt: 0.15,
        }}
      >
        {index}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', letterSpacing: '-0.02em' }}>
          {titulo}
        </Typography>
        <Typography
          sx={{
            mt: 0.4,
            fontSize: '0.78rem',
            lineHeight: 1.55,
            color: alpha('#fff', 0.72),
          }}
        >
          {texto}
        </Typography>
      </Box>
    </Box>
  )
}

export function MedicamentoAbasExplicacaoModal({
  open,
  onClose,
}: MedicamentoAbasExplicacaoModalProps) {
  const theme = useTheme()
  const imhAccent = theme.palette.primary.light
  const listaAccent = theme.palette.success.light

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="body"
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(16px)',
            backgroundColor: alpha('#020617', 0.72),
          },
        },
        paper: {
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            color: '#fff',
            background: `linear-gradient(165deg, #0b1220 0%, #111827 42%, #0f172a 100%)`,
            border: `1px solid ${alpha('#fff', 0.12)}`,
            boxShadow: `0 40px 120px ${alpha('#000', 0.55)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.25)}`,
          },
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          px: { xs: 2.25, sm: 3.5 },
          pt: 3,
          pb: 1.5,
          background: `radial-gradient(90% 140% at 0% 0%, ${alpha(theme.palette.primary.main, 0.45)} 0%, transparent 55%), radial-gradient(70% 120% at 100% 0%, ${alpha(theme.palette.success.main, 0.28)} 0%, transparent 50%)`,
        }}
      >
        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 10,
            top: 10,
            color: alpha('#fff', 0.8),
            bgcolor: alpha('#fff', 0.06),
            '&:hover': { bgcolor: alpha('#fff', 0.12) },
          }}
        >
          <CloseIcon />
        </IconButton>

        <Chip
          icon={<AutoAwesomeIcon sx={{ fontSize: 16, color: '#fff !important' }} />}
          label="Portal medicamento"
          size="small"
          sx={{
            height: 24,
            fontWeight: 700,
            letterSpacing: '0.06em',
            bgcolor: alpha('#fff', 0.1),
            color: '#fff',
            border: `1px solid ${alpha('#fff', 0.16)}`,
          }}
        />
        <Typography
          variant="h5"
          sx={{
            mt: 1.25,
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1.15,
            pr: 5,
          }}
        >
          Como funcionam IMH e Lista de Medicamentos
        </Typography>
        <Typography
          sx={{
            mt: 0.85,
            maxWidth: 640,
            fontSize: '0.86rem',
            lineHeight: 1.55,
            color: alpha('#fff', 0.7),
          }}
        >
          As duas abas trabalham juntas: a Lista é o estoque e o catálogo de preços; o IMH é o
          lançamento PME que baixa esse estoque e envia a planilha para a timeline.
        </Typography>
      </Box>

      <Box
        sx={{
          px: { xs: 2.25, sm: 3.5 },
          pb: 3,
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          alignItems: 'start',
        }}
      >
        <Box
          sx={{
            p: 1.75,
            borderRadius: 3,
            background: alpha(theme.palette.primary.main, 0.12),
            border: `1px solid ${alpha(theme.palette.primary.light, 0.28)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1, mb: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: alpha(theme.palette.primary.main, 0.9),
                boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.4)}`,
              }}
            >
              <PharmacyIcon />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>IMH</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: alpha('#fff', 0.62) }}>
                Modelo IHM — PME
              </Typography>
            </Box>
          </Box>
          {IMH_PASSOS.map((passo, index) => (
            <Box key={passo.titulo} sx={{ mb: index === IMH_PASSOS.length - 1 ? 0 : 1 }}>
              <PassoCard
                index={index + 1}
                titulo={passo.titulo}
                texto={passo.texto}
                accent={imhAccent}
              />
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            p: 1.75,
            borderRadius: 3,
            background: alpha(theme.palette.success.main, 0.1),
            border: `1px solid ${alpha(theme.palette.success.light, 0.28)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.1, mb: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: alpha(theme.palette.success.main, 0.95),
                boxShadow: `0 12px 28px ${alpha(theme.palette.success.main, 0.4)}`,
              }}
            >
              <InventoryIcon />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
                Lista de Medicamentos
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: alpha('#fff', 0.62) }}>
                Catálogo, QTD e preço
              </Typography>
            </Box>
          </Box>
          {LISTA_PASSOS.map((passo, index) => (
            <Box key={passo.titulo} sx={{ mb: index === LISTA_PASSOS.length - 1 ? 0 : 1 }}>
              <PassoCard
                index={index + 1}
                titulo={passo.titulo}
                texto={passo.texto}
                accent={listaAccent}
              />
            </Box>
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          mx: { xs: 2.25, sm: 3.5 },
          mb: 3,
          p: 1.75,
          borderRadius: 3,
          display: 'flex',
          gap: 1.5,
          alignItems: 'flex-start',
          background: alpha('#fff', 0.05),
          border: `1px solid ${alpha('#fff', 0.1)}`,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.75,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            bgcolor: alpha(theme.palette.info.main, 0.85),
          }}
        >
          <TimelineIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.88rem' }}>Fluxo resumido</Typography>
          <Typography sx={{ mt: 0.4, fontSize: '0.78rem', lineHeight: 1.55, color: alpha('#fff', 0.7) }}>
            Cadastre o estoque na Lista → lance o PME no IMH (paciente + medicamento) → a QTD
            baixa sozinha → marque IMH e envie. A aba Pacientes só apoia o preenchimento automático
            do NIP/nome/vínculo.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={onClose}
          sx={{
            display: { xs: 'none', sm: 'inline-flex' },
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: 2,
            px: 2,
            whiteSpace: 'nowrap',
            boxShadow: `0 10px 24px ${alpha(theme.palette.primary.main, 0.45)}`,
          }}
        >
          Entendi
        </Button>
      </Box>
    </Dialog>
  )
}
