import { Box, Button, CircularProgress, Typography, alpha } from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import TableChartIcon from '@mui/icons-material/TableChart'
import { useCallback, useState } from 'react'

interface OdsUploadZoneProps {
  onFile: (file: File) => void
  isLoading?: boolean
  error?: string | null
}

export function OdsUploadZone({ onFile, isLoading, error }: OdsUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        handleFiles(e.dataTransfer.files)
      }}
      sx={(theme) => ({
        border: `2px dashed ${dragOver ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.35)}`,
        borderRadius: 4,
        p: { xs: 4, md: 6 },
        textAlign: 'center',
        bgcolor: dragOver
          ? alpha(theme.palette.primary.main, 0.06)
          : alpha(theme.palette.primary.main, 0.02),
        transition: 'all 0.2s ease',
        cursor: isLoading ? 'wait' : 'pointer',
      })}
      component="label"
    >
      <input
        type="file"
        hidden
        accept=".ods,application/vnd.oasis.opendocument.spreadsheet"
        disabled={isLoading}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {isLoading ? (
        <CircularProgress size={48} sx={{ mb: 2 }} />
      ) : (
        <Box
          sx={(theme) => ({
            width: 72,
            height: 72,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
            boxShadow: '0 8px 24px rgba(11, 61, 145, 0.25)',
          })}
        >
          <CloudUploadIcon sx={{ fontSize: 36, color: 'white' }} />
        </Box>
      )}

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        {isLoading ? 'Processando planilha...' : 'Anexar planilha ODS'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mb: 2 }}>
        Arraste o arquivo <strong>CONSUMO MATERIAL CONSIGNADO</strong> (.ods) ou clique para
        selecionar. Os lançamentos serão exibidos em uma planilha interativa para revisão e envio.
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
        <TableChartIcon fontSize="small" color="primary" />
        <Typography variant="caption" color="text.secondary">
          Formato aceito: .ods (OpenDocument Spreadsheet)
        </Typography>
      </Box>

      {!isLoading && (
        <Button variant="contained" component="span" startIcon={<CloudUploadIcon />}>
          Selecionar arquivo
        </Button>
      )}

      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 2, fontWeight: 600 }}>
          {error}
        </Typography>
      )}
    </Box>
  )
}
