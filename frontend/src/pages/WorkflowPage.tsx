import { useMemo, type SyntheticEvent } from 'react'
import { Box, Tab, Tabs } from '@mui/material'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { EtapasWorkflowTab } from '@/components/workflow/EtapasWorkflowTab'
import { PrazosConfigTab } from '@/components/workflow/PrazosConfigTab'
import { useGestorAuth } from '@/contexts/AuthContext'
import { hasPermission } from '@/utils/permissions'

type WorkflowTab = 'etapas' | 'prazos'

export default function WorkflowPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useGestorAuth()

  const tabs = useMemo(() => {
    const items: { id: WorkflowTab; label: string }[] = [
      { id: 'etapas', label: 'Etapas do Workflow' },
      { id: 'prazos', label: 'Configurar Prazos' },
    ]
    return items
  }, [])

  const activeTab = (searchParams.get('tab') as WorkflowTab) || 'etapas'
  const tabIndex = Math.max(0, tabs.findIndex((t) => t.id === activeTab))

  const handleTabChange = (_: SyntheticEvent, index: number) => {
    const tab = tabs[index]?.id ?? 'etapas'
    setSearchParams(tab === 'etapas' ? {} : { tab })
  }

  const canSeePrazos = user ? hasPermission(user.perfil, 'workflow:read') : false

  return (
    <>
      <PageHeader
        title="Workflow"
        subtitle="Fluxo do processo e configuração de prazos por etapa"
      />

      <Tabs value={tabIndex} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Etapas do Workflow" />
        {canSeePrazos && <Tab label="Configurar Prazos" />}
      </Tabs>

      <Box>
        {activeTab === 'prazos' && canSeePrazos ? (
          <PrazosConfigTab />
        ) : (
          <EtapasWorkflowTab />
        )}
      </Box>
    </>
  )
}
