/** Coleções Firestore — espelham as entidades de AppData */
export const FIRESTORE_COLLECTIONS = {
  usuarios: 'usuarios',
  clinicas: 'clinicas',
  empresas: 'empresas',
  materiais: 'materiais',
  workflowEtapas: 'workflowEtapas',
  pedidos: 'pedidos',
  solemp: 'solemp',
  notasFiscais: 'notasFiscais',
  historico: 'historico',
  arquivos: 'arquivos',
  notificacoes: 'notificacoes',
  reversoes: 'reversoes',
  consumoPlanilha: 'consumoPlanilha',
  pedidoPlanilhaEnvio: 'pedidoPlanilhaEnvio',
  processosArquivados: 'processosArquivados',
  /** Documento transitório com snapshot completo (fase 1 da migração) */
  appState: 'appState',
  /** Raiz de cada organização (multi-tenant por conta Google) */
  tenants: 'tenants',
} as const

export const FIRESTORE_APP_STATE_DOC_ID = 'current'

/** Caminhos no Firebase Storage */
export const FIREBASE_STORAGE_PATHS = {
  planilhas: 'planilhas',
  anexos: 'anexos',
  notasFiscais: 'notas-fiscais',
} as const
