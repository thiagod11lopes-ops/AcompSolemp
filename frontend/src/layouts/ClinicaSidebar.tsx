import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Typography,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import ListAltIcon from '@mui/icons-material/ListAlt'
import AddIcon from '@mui/icons-material/Add'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import TimelineIcon from '@mui/icons-material/Timeline'
import { NavLink } from 'react-router-dom'
import { useClinicaAuth } from '@/contexts/AuthContext'
import { useClinicas } from '@/hooks/useCadastros'

const DRAWER_WIDTH = 240

const menuItems = [
  { path: '/clinica/pedidos', label: 'Meus Pedidos', icon: <ListAltIcon />, end: true },
  { path: '/clinica/pedidos/novo', label: 'Novo Lançamento', icon: <AddIcon />, end: false },
  { path: '/clinica/timeline', label: 'Timeline', icon: <TimelineIcon />, end: true },
]

interface ClinicaSidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function ClinicaSidebar({ mobileOpen, onClose }: ClinicaSidebarProps) {
  const { user } = useClinicaAuth()
  const { data: clinicas = [] } = useClinicas()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const clinica = clinicas.find((c) => c.id === user?.clinicaId)

  const drawer = (
    <Box>
      <Toolbar sx={{ px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalHospitalIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 700 }}>
              Portal da Clínica
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Materiais Consignados
            </Typography>
          </Box>
        </Box>
      </Toolbar>
      <Divider />
      {user && (
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {clinica?.nome ?? 'Clínica'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user.posto} {user.nome}
          </Typography>
        </Box>
      )}
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            end={item.end}
            onClick={isMobile ? onClose : undefined}
            sx={{
              '&.active': {
                bgcolor: 'action.selected',
                borderRight: 3,
                borderColor: 'primary.main',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  )

  return (
    <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  )
}

export { DRAWER_WIDTH as CLINICA_DRAWER_WIDTH }
