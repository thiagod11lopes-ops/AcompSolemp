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
import PaymentsIcon from '@mui/icons-material/Payments'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import { NavLink } from 'react-router-dom'
import { useFinanceiroAuth } from '@/contexts/AuthContext'

const DRAWER_WIDTH = 240

const menuItems = [
  { path: '/financeiro/pagamentos', label: 'Pagamentos pendentes', icon: <PaymentsIcon /> },
]

interface FinanceiroSidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function FinanceiroSidebar({ mobileOpen, onClose }: FinanceiroSidebarProps) {
  const { user } = useFinanceiroAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const drawer = (
    <Box>
      <Toolbar sx={{ px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountBalanceIcon color="success" />
          <Box>
            <Typography variant="subtitle1" color="success.dark" sx={{ fontWeight: 700 }}>
              Financeiro
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Pagamento de NF
            </Typography>
          </Box>
        </Box>
      </Toolbar>
      <Divider />
      {user && (
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {user.nome}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Setor Financeiro
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
            end
            onClick={isMobile ? onClose : undefined}
            sx={{
              '&.active': {
                bgcolor: 'action.selected',
                borderRight: 3,
                borderColor: 'success.main',
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

export { DRAWER_WIDTH as FINANCEIRO_DRAWER_WIDTH }
