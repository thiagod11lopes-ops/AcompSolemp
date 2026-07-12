import { LocalAppDataRepository } from '@/data/repositories/local/LocalAppDataRepository'
import { LocalCadastroRepository } from '@/data/repositories/local/LocalCadastroRepository'
import { LocalPedidoRepository } from '@/data/repositories/local/LocalPedidoRepository'
import {
  LocalHistoricoRepository,
  LocalNotificacaoRepository,
  LocalPlanilhaRepository,
  LocalProcessoArquivadoRepository,
  LocalReversaoRepository,
} from '@/data/repositories/local/LocalSupportRepositories'
import type { Repositories } from '@/data/repositories/types'

let repositories: Repositories | null = null

function createLocalRepositories(): Repositories {
  return {
    appData: new LocalAppDataRepository(),
    pedidos: new LocalPedidoRepository(),
    cadastros: new LocalCadastroRepository(),
    notificacoes: new LocalNotificacaoRepository(),
    historico: new LocalHistoricoRepository(),
    processosArquivados: new LocalProcessoArquivadoRepository(),
    reversoes: new LocalReversaoRepository(),
    planilhas: new LocalPlanilhaRepository(),
  }
}

export function getRepositories(): Repositories {
  if (!repositories) {
    repositories = createLocalRepositories()
  }
  return repositories
}

export function resetRepositoriesForTests(): void {
  repositories = null
}
