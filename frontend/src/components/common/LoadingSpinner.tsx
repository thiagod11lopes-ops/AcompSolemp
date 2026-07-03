import { Box, CircularProgress } from '@mui/material'

export function LoadingSpinner({ minHeight = 300 }: { minHeight?: number }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight,
      }}
    >
      <CircularProgress />
    </Box>
  )
}
