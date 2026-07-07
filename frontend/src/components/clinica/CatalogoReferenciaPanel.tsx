import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
} from '@mui/material'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import { CATALOGO_REFERENCIA } from '@/utils/consumoMaterialTemplate'

export const CATALOGO_REFERENCIA_BAR_HEIGHT = 188

export function CatalogoReferenciaPanel() {
  return (
    <Box
      sx={(theme) => ({
        width: { xs: '100%', md: 400, lg: 460 },
        border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper',
      })}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 0.75,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
        }}
      >
        <MenuBookIcon color="primary" sx={{ fontSize: 18 }} />
        <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          Tabela de referência — Diagnóstico / CID / Procedimento / Material
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {CATALOGO_REFERENCIA.length} itens
        </Typography>
      </Box>
      <TableContainer sx={{ maxHeight: 148 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {['DIAGNÓSTICO', 'CID', 'PROCEDIMENTO', 'MATERIAL'].map((h) => (
                <TableCell
                  key={h}
                  sx={{
                    bgcolor: '#37474F',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    py: 0.5,
                    letterSpacing: 0.4,
                  }}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {CATALOGO_REFERENCIA.map((row, index) => (
              <TableRow
                key={`${row.cid}-${index}`}
                sx={(theme) => ({
                  bgcolor:
                    index % 2 === 0
                      ? 'background.paper'
                      : alpha(theme.palette.action.hover, 0.04),
                })}
              >
                <TableCell sx={{ fontSize: '0.7rem', py: 0.5 }}>{row.diagnostico}</TableCell>
                <TableCell sx={{ fontSize: '0.7rem', py: 0.5, whiteSpace: 'nowrap' }}>
                  {row.cid}
                </TableCell>
                <TableCell sx={{ fontSize: '0.7rem', py: 0.5 }}>{row.procedimento}</TableCell>
                <TableCell sx={{ fontSize: '0.7rem', py: 0.5, color: 'text.secondary' }}>
                  {row.material || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
