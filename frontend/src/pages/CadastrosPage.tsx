import { PageHeader } from '@/components/common/PageHeader'
import { UsuariosTab } from '@/components/cadastros/UsuariosTab'

export default function CadastrosPage() {
  return (
    <>
      <PageHeader
        title="Cadastros"
        subtitle="Cadastro de clínicas e setores com e-mail Google autorizado"
      />
      <UsuariosTab />
    </>
  )
}
