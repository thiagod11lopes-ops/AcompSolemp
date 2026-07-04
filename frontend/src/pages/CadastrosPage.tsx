import { PageHeader } from '@/components/common/PageHeader'
import { UsuariosTab } from '@/components/cadastros/UsuariosTab'

export default function CadastrosPage() {
  return (
    <>
      <PageHeader
        title="Cadastros"
        subtitle="Cadastro de clínicas e responsáveis das etapas da Div. de Material (nome e senha)"
      />
      <UsuariosTab />
    </>
  )
}
