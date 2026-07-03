import { useState } from 'react'
import { Tabs, Tab, Box } from '@mui/material'
import { PageHeader } from '@/components/common/PageHeader'
import { ClinicasTab } from '@/components/cadastros/ClinicasTab'
import { EmpresasTab } from '@/components/cadastros/EmpresasTab'
import { MateriaisTab } from '@/components/cadastros/MateriaisTab'
import { UsuariosTab } from '@/components/cadastros/UsuariosTab'

export default function CadastrosPage() {
  const [tab, setTab] = useState(0)

  return (
    <>
      <PageHeader
        title="Cadastros"
        subtitle="Gerenciamento de clínicas, empresas, materiais e usuários dos portais"
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Clínicas" />
        <Tab label="Empresas" />
        <Tab label="Materiais" />
        <Tab label="Usuários" />
      </Tabs>
      <Box>
        {tab === 0 && <ClinicasTab />}
        {tab === 1 && <EmpresasTab />}
        {tab === 2 && <MateriaisTab />}
        {tab === 3 && <UsuariosTab />}
      </Box>
    </>
  )
}
