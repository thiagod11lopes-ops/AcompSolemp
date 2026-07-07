import type {
  Clinica,
  Empresa,
  HistoricoEvento,
  Material,
  Notification,
  User,
  WorkflowEtapa,
} from '@/types'
import { delay, loadFreshAppData, loadAppData, saveAppData } from '@/mocks/seed'

export const cadastroService = {
  async listClinicas(): Promise<Clinica[]> {
    await delay(null)
    return loadAppData().clinicas
  },

  async listEmpresas(): Promise<Empresa[]> {
    await delay(null)
    return loadAppData().empresas
  },

  async listMateriais(): Promise<Material[]> {
    await delay(null)
    return loadAppData().materiais
  },

  async listUsuarios(): Promise<User[]> {
    await delay(null)
    return loadAppData().usuarios
  },

  async saveClinica(clinica: Clinica): Promise<Clinica> {
    await delay(null)
    const data = loadAppData()
    const index = data.clinicas.findIndex((c) => c.id === clinica.id)
    if (index >= 0) data.clinicas[index] = clinica
    else data.clinicas.push(clinica)
    saveAppData(data)
    return clinica
  },

  async saveEmpresa(empresa: Empresa): Promise<Empresa> {
    await delay(null)
    const data = loadAppData()
    const index = data.empresas.findIndex((e) => e.id === empresa.id)
    if (index >= 0) data.empresas[index] = empresa
    else data.empresas.push(empresa)
    saveAppData(data)
    return empresa
  },

  async findOrCreateEmpresaByNome(nome: string): Promise<Empresa> {
    await delay(null, 200)
    const trimmed = nome.trim()
    if (!trimmed) throw new Error('Informe a empresa fornecedora')

    const data = loadAppData()
    const existing = data.empresas.find(
      (e) =>
        e.nomeFantasia.localeCompare(trimmed, 'pt-BR', { sensitivity: 'accent' }) === 0 ||
        e.razaoSocial.localeCompare(trimmed, 'pt-BR', { sensitivity: 'accent' }) === 0,
    )
    if (existing) return existing

    return this.saveEmpresa({
      id: `empresa-${Date.now()}`,
      nomeFantasia: trimmed,
      razaoSocial: trimmed,
      cnpj: '',
      contato: '',
      telefone: '',
      email: '',
    })
  },

  async saveMaterial(material: Material): Promise<Material> {
    await delay(null)
    const data = loadAppData()
    const index = data.materiais.findIndex((m) => m.id === material.id)
    if (index >= 0) data.materiais[index] = material
    else data.materiais.push(material)
    saveAppData(data)
    return material
  },

  async findOrCreateMaterialByDescricao(input: string): Promise<Material> {
    await delay(null, 200)
    const trimmed = input.trim()
    if (!trimmed) throw new Error('Informe o material')

    const match = trimmed.match(/^(.+?)\s*\(([A-Za-z]+)\)\s*$/)
    const descricao = (match ? match[1] : trimmed).trim()
    const unidade = match ? match[2].toUpperCase() : 'UN'

    const data = loadAppData()
    const existing = data.materiais.find(
      (m) => m.descricao.localeCompare(descricao, 'pt-BR', { sensitivity: 'accent' }) === 0,
    )
    if (existing) return existing

    return this.saveMaterial({
      id: `material-${Date.now()}`,
      descricao,
      fabricante: '',
      unidade,
    })
  },

  async saveUsuario(usuario: User): Promise<User> {
    await delay(null)
    const data = loadAppData()
    const index = data.usuarios.findIndex((u) => u.id === usuario.id)
    if (index >= 0) data.usuarios[index] = usuario
    else data.usuarios.push(usuario)
    saveAppData(data)
    return usuario
  },
}

export const workflowService = {
  async listEtapas(): Promise<WorkflowEtapa[]> {
    await delay(null)
    const data = await loadFreshAppData()
    return [...data.workflowEtapas].sort((a, b) => a.ordem - b.ordem)
  },

  async saveEtapas(etapas: WorkflowEtapa[]): Promise<WorkflowEtapa[]> {
    await delay(null)
    const data = loadAppData()
    data.workflowEtapas = etapas
    saveAppData(data)
    return etapas
  },
}

export const historicoService = {
  async list(pedidoId?: string): Promise<HistoricoEvento[]> {
    await delay(null)
    const data = await loadFreshAppData()
    let historico = data.historico
    if (pedidoId) historico = historico.filter((h) => h.pedidoId === pedidoId)
    return historico.sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
    )
  },
}

export const notificationService = {
  async list(perfil?: Notification['perfilDestino']): Promise<Notification[]> {
    await delay(null, 300)
    const all = loadAppData().notificacoes.sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
    )

    if (!perfil || perfil === 'GESTOR' || perfil === 'ADMINISTRADOR') {
      return all
    }

    return all.filter(
      (n) =>
        n.perfilDestino === perfil ||
        (n.perfilDestino == null && perfil === 'CLINICA' && n.tipo === 'RESPOSTA_GESTOR'),
    )
  },

  async markAsRead(id: string): Promise<void> {
    await delay(null, 200)
    const data = loadAppData()
    const notif = data.notificacoes.find((n) => n.id === id)
    if (notif) notif.lida = true
    saveAppData(data)
  },

  async markAllAsRead(perfil?: Notification['perfilDestino']): Promise<void> {
    await delay(null, 200)
    const data = loadAppData()
    data.notificacoes.forEach((n) => {
      if (!perfil || perfil === 'GESTOR' || perfil === 'ADMINISTRADOR') {
        n.lida = true
        return
      }
      if (
        n.perfilDestino === perfil ||
        (n.perfilDestino == null && perfil === 'CLINICA' && n.tipo === 'RESPOSTA_GESTOR')
      ) {
        n.lida = true
      }
    })
    saveAppData(data)
  },
}
