import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import WorkOutlineIcon from '@mui/icons-material/WorkOutline'
import {
  AppBar,
  Box,
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'

const drawerWidth = 248
const navigation = [
  { label: 'Dashboard', path: '/', icon: <DashboardOutlinedIcon /> },
  { label: 'Companies', path: '/companies', icon: <ApartmentOutlinedIcon /> },
  { label: 'Jobs', path: '/jobs', icon: <WorkOutlineIcon /> },
  { label: 'Candidates', path: '/candidates', icon: <GroupsOutlinedIcon /> },
]

export function DashboardLayout() {
  const { logout, roles } = useAuth()
  const navigate = useNavigate()
  const visibleNavigation = navigation.filter(
    (item) => item.path !== '/companies' || roles.includes('Admin'),
  )

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', pl: `${drawerWidth + 24}px !important` }}>
          <Typography variant="h6" fontWeight={700}>
            TalRekrut
          </Typography>
          <Button onClick={handleLogout}>Sign out</Button>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <List sx={{ px: 1.5, py: 2 }}>
          {visibleNavigation.map((item) => (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              end={item.path === '/'}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.active': { bgcolor: 'primary.main', color: 'primary.contrastText' },
                '&.active .MuiListItemIcon-root': { color: 'inherit' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
