import { Button, type ButtonProps } from '@mui/material'
import type { Portal } from '@/utils/portal'
import { authService } from '@/services/authService'

interface GoogleSignInButtonProps extends Omit<ButtonProps, 'onClick'> {
  portal?: Portal
  onClick: () => void | Promise<void>
  loading?: boolean
  label?: string
}

export function GoogleSignInButton({
  portal = 'gestor',
  onClick,
  loading = false,
  label = 'Entrar com Google',
  disabled,
  ...props
}: GoogleSignInButtonProps) {
  if (!authService.requiresGoogleAuth(portal)) return null

  return (
    <Button
      fullWidth
      variant="outlined"
      size="large"
      onClick={() => void onClick()}
      disabled={disabled || loading}
      startIcon={
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
          <path
            fill="#FFC107"
            d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-5.522 0-10-4.478-10-10s4.478-10 10-10c2.523 0 4.817.943 6.564 2.486l6.062-6.062C33.46 9.21 28.978 7 24 7 13.507 7 5 15.507 5 26s8.507 19 19 19 19-8.507 19-19c0-1.341-.138-2.65-.389-3.917z"
          />
          <path
            fill="#FF3D00"
            d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 13 24 13c2.523 0 4.817.943 6.564 2.486l6.062-6.062C33.46 9.21 28.978 7 24 7 16.318 7 9.656 11.337 6.306 14.691z"
          />
          <path
            fill="#4CAF50"
            d="M24 45c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 45 24 45z"
          />
          <path
            fill="#1976D2"
            d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 45 30.675 45 26c0-1.341-.138-2.65-.389-3.917z"
          />
        </svg>
      }
      sx={{
        textTransform: 'none',
        fontWeight: 600,
        borderColor: 'divider',
        color: 'text.primary',
        bgcolor: 'background.paper',
        '&:hover': { bgcolor: 'action.hover', borderColor: 'divider' },
      }}
      {...props}
    >
      {loading ? 'Conectando...' : label}
    </Button>
  )
}
