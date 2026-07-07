import type {
  Clinica,
  Empresa,
  Material,
  User,
  WorkflowEtapa,
} from '@/types'
import { loadAppData } from '@/mocks/seed'
import type { CadastroRepository } from '@/data/repositories/types'

export class LocalCadastroRepository implements CadastroRepository {
  async listClinicas(): Promise<Clinica[]> {
    return loadAppData().clinicas
  }

  async listEmpresas(): Promise<Empresa[]> {
    return loadAppData().empresas
  }

  async listMateriais(): Promise<Material[]> {
    return loadAppData().materiais
  }

  async listUsuarios(): Promise<User[]> {
    return loadAppData().usuarios
  }

  async listWorkflowEtapas(): Promise<WorkflowEtapa[]> {
    return loadAppData().workflowEtapas
  }
}
