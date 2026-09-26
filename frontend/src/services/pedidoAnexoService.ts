import { isDemoDataSession } from '@/config/dataSource'
import { loadAppData, reloadAppDataFromStorage, saveAppData } from '@/mocks/seed'
import type { ArquivoAnexo } from '@/types'

function readData() {
  if (isDemoDataSession()) return reloadAppDataFromStorage()
  return loadAppData()
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `anexo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const pedidoAnexoService = {
  /** Registra metadados dos arquivos anexados no envio da planilha. */
  saveForPedido(pedidoId: string, files: File[]): ArquivoAnexo[] {
    if (!pedidoId || files.length === 0) return []

    const data = readData()
    const agora = new Date().toISOString()
    const criados: ArquivoAnexo[] = files.map((file) => ({
      id: createId(),
      pedidoId,
      nome: file.name,
      tipo: 'OUTRO',
      dataUpload: agora,
      tamanhoKb: Math.max(1, Math.round(file.size / 1024)),
    }))

    data.arquivos = [...(data.arquivos ?? []), ...criados]
    saveAppData(data)
    return criados
  },
}
