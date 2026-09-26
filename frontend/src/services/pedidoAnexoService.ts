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

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function guessMimeType(fileName: string, fallback?: string): string {
  if (fallback && fallback !== 'application/octet-stream') return fallback
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.docx'))
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (lower.endsWith('.doc')) return 'application/msword'
  if (lower.endsWith('.xlsx'))
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel'
  if (lower.endsWith('.ods')) return 'application/vnd.oasis.opendocument.spreadsheet'
  if (lower.endsWith('.odt')) return 'application/vnd.oasis.opendocument.text'
  if (lower.endsWith('.txt') || lower.endsWith('.text') || lower.endsWith('.md'))
    return 'text/plain'
  if (lower.endsWith('.csv')) return 'text/csv'
  if (lower.endsWith('.json')) return 'application/json'
  return 'application/octet-stream'
}

function cloneAnexo(arquivo: ArquivoAnexo): ArquivoAnexo {
  return { ...arquivo }
}

export const pedidoAnexoService = {
  listByPedido(pedidoId: string): ArquivoAnexo[] {
    if (!pedidoId) return []
    const data = readData()
    const daPlanilha = data.pedidoPlanilhaEnvio?.[pedidoId]?.anexos ?? []
    const globais = (data.arquivos ?? []).filter((arquivo) => arquivo.pedidoId === pedidoId)

    const byId = new Map<string, ArquivoAnexo>()
    for (const arquivo of [...globais, ...daPlanilha]) {
      byId.set(arquivo.id, cloneAnexo(arquivo))
    }

    return [...byId.values()].sort((a, b) => b.dataUpload.localeCompare(a.dataUpload))
  },

  /**
   * Registra metadados + conteúdo dos arquivos anexados no envio da planilha.
   * Grava em `pedidoPlanilhaEnvio[pedidoId].anexos` (viaja com a planilha) e em `arquivos`.
   */
  async saveForPedido(pedidoId: string, files: File[]): Promise<ArquivoAnexo[]> {
    if (!pedidoId || files.length === 0) return []

    // Codifica antes de ler o AppData, para não gravar snapshot stale após o await.
    const agora = new Date().toISOString()
    const criados: ArquivoAnexo[] = []
    for (const file of files) {
      const conteudoBase64 = await fileToBase64(file)
      criados.push({
        id: createId(),
        pedidoId,
        nome: file.name,
        tipo: 'OUTRO',
        dataUpload: agora,
        tamanhoKb: Math.max(1, Math.round(file.size / 1024)),
        conteudoBase64,
        mimeType: guessMimeType(file.name, file.type),
      })
    }

    const data = readData()
    if (!data.pedidoPlanilhaEnvio) data.pedidoPlanilhaEnvio = {}

    const existing = data.pedidoPlanilhaEnvio[pedidoId]
    if (existing) {
      data.pedidoPlanilhaEnvio[pedidoId] = {
        ...existing,
        anexos: [...(existing.anexos ?? []).map(cloneAnexo), ...criados.map(cloneAnexo)],
      }
    } else {
      // Pedido ainda sem snapshot de planilha: mantém só em arquivos globais.
      // (O envio normal grava a planilha antes dos anexos.)
    }

    data.arquivos = [...(data.arquivos ?? []), ...criados.map(cloneAnexo)]
    saveAppData(data)
    return criados
  },

  download(arquivo: ArquivoAnexo): boolean {
    if (!arquivo.conteudoBase64) return false
    const mime = arquivo.mimeType || guessMimeType(arquivo.nome)
    const link = document.createElement('a')
    link.href = `data:${mime};base64,${arquivo.conteudoBase64}`
    link.download = arquivo.nome
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    return true
  },
}
