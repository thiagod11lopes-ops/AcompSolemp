import { createTheme, type ThemeOptions } from '@mui/material/styles'

const baseTheme: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        },
      },
    },
  },
}

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    primary: { main: '#0B3D91', light: '#3D6BB3', dark: '#072A66' },
    secondary: { main: '#C9A227' },
    background: { default: '#F4F6FA', paper: '#FFFFFF' },
    success: { main: '#2E7D32' },
    warning: { main: '#ED6C02' },
    error: { main: '#D32F2F' },
  },
})

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: { main: '#5B9BD5', light: '#8BB8E8', dark: '#3A6FA0' },
    secondary: { main: '#D4AF37' },
    background: { default: '#0F1419', paper: '#1A2332' },
    success: { main: '#66BB6A' },
    warning: { main: '#FFA726' },
    error: { main: '#EF5350' },
  },
})
