import { useState, type ReactNode } from 'react'
import { Box, Tab, Tabs } from '@mui/material'
import { PedidoAuditoriaPanel } from '@/components/pedido/PedidoAuditoriaPanel'

interface PedidoDetalheTabsProps {
  pedidoId: string
  timeline: ReactNode
}

/** Abas Timeline | Auditoria no detalhe do PED. */
export function PedidoDetalheTabs({ pedidoId, timeline }: PedidoDetalheTabsProps) {
  const [tab, setTab] = useState(0)
  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v: number) => setTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Timeline" sx={{ textTransform: 'none', fontWeight: 700 }} />
        <Tab label="Auditoria" sx={{ textTransform: 'none', fontWeight: 700 }} />
      </Tabs>
      {tab === 0 ? timeline : <PedidoAuditoriaPanel pedidoId={pedidoId} />}
    </Box>
  )
}
