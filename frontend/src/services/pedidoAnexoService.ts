import { isDemoDataSession, useCloudAppDataSync } from '@/config/dataSource'
import { loadAppData, reloadAppDataFromStorage, saveAppData } from '@/mocks/seed'
import { getSupabaseClient } from '@/supabase/client'
import { getTenantId } from '@/services/tenantService'
import type { ArquivoAnexo, PedidoPlanilhaEnvioState } from '@/types'

const STORAGE_BUCKET = 'planilha-anexos'

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

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-()\sÀ-ÿ]/gi, '_').replace(/\s+/g, ' ').trim() || 'arquivo'
}

function emptyPlanilhaSnapshot(anexos: ArquivoAnexo[]): PedidoPlanilhaEnvioState {
  return {
    formato: 'divMaterial',
    cabecalho: {
      numeroRelacao: '',
      pregaoTad: '',
      data: '',
      vigencia: '',
      processo: '',
      fornecedor: '',
    },
    linhas: [],
    anexos: anexos.map(cloneAnexo),
    enviadoEm: new Date().toISOString(),
  }
}

function mergeAnexoLists(a: ArquivoAnexo[] = [], b: ArquivoAnexo[] = []): ArquivoAnexo[] {
  const byId = new Map<string, ArquivoAnexo>()
  for (const arquivo of [...a, ...b]) {
    byId.set(arquivo.id, cloneAnexo(arquivo))
  }
  return [...byId.values()]
}

async function uploadToStorage(
  tenantId: string,
  pedidoId: string,
  anexoId: string,
  file: File,
  mimeType: string,
): Promise<string | null> {
  try {
    const path = `${tenantId}/${pedidoId}/${anexoId}/${sanitizeFileName(file.name)}`
    const client = getSupabaseClient()
    const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: mimeType,
    })
    if (error) {
      console.warn('[AcompSolemp] Falha ao enviar anexo ao Storage:', error.message)
      return null
    }
    return path
  } catch (error) {
    console.warn('[AcompSolemp] Storage indisponível para anexos:', error)
    return null
  }
}

function writeAnexosIntoData(
  data: ReturnType<typeof loadAppData>,
  pedidoId: string,
  anexosLeves: ArquivoAnexo[],
): void {
  if (!data.pedidoPlanilhaEnvio) data.pedidoPlanilhaEnvio = {}
  if (!data.planilhaAnexosPorPedido) data.planilhaAnexosPorPedido = {}

  const existingSnap = data.pedidoPlanilhaEnvio[pedidoId]
  const mergedSnap = mergeAnexoLists(existingSnap?.anexos, anexosLeves)
  if (existingSnap) {
    data.pedidoPlanilhaEnvio[pedidoId] = {
      ...existingSnap,
      anexos: mergedSnap,
    }
  } else {
    data.pedidoPlanilhaEnvio[pedidoId] = emptyPlanilhaSnapshot(mergedSnap)
  }

  data.planilhaAnexosPorPedido[pedidoId] = mergeAnexoLists(
    data.planilhaAnexosPorPedido[pedidoId],
    mergedSnap,
  )

  const arquivosById = new Map<string, ArquivoAnexo>()
  for (const arquivo of [...(data.arquivos ?? []), ...anexosLeves]) {
    arquivosById.set(arquivo.id, cloneAnexo(arquivo))
  }
  data.arquivos = [...arquivosById.values()]
}

export const pedidoAnexoService = {
  listByPedido(pedidoId: string): ArquivoAnexo[] {
    if (!pedidoId) return []
    const data = readData()
    const daPlanilha = data.pedidoPlanilhaEnvio?.[pedidoId]?.anexos ?? []
    const doIndice = data.planilhaAnexosPorPedido?.[pedidoId] ?? []
    const globais = (data.arquivos ?? []).filter((arquivo) => arquivo.pedidoId === pedidoId)
    return mergeAnexoLists(mergeAnexoLists(globais, daPlanilha), doIndice).sort((a, b) =>
      b.dataUpload.localeCompare(a.dataUpload),
    )
  },

  /**
   * Registra anexos no snapshot da planilha + índice dedicado.
   * Em nuvem: sobe o arquivo ao Storage e grava metadados + storagePath no AppData.
   */
  async saveForPedido(pedidoId: string, files: File[]): Promise<ArquivoAnexo[]> {
    if (!pedidoId || files.length === 0) return []

    const cloud = useCloudAppDataSync()
    const tenantId = getTenantId()
    const agora = new Date().toISOString()
    const criados: ArquivoAnexo[] = []
    const falhasStorage: string[] = []

    for (const file of files) {
      const id = createId()
      const mimeType = guessMimeType(file.name, file.type)
      let storagePath: string | undefined
      let conteudoBase64: string | undefined

      if (cloud && tenantId) {
        storagePath = (await uploadToStorage(tenantId, pedidoId, id, file, mimeType)) ?? undefined
        if (!storagePath) falhasStorage.push(file.name)
      }

      if (!storagePath) {
        // Sempre guarda base64 como fallback para o arquivo aparecer/baixar.
        // Arquivos grandes podem falhar no sync; o Storage é o caminho preferencial.
        try {
          conteudoBase64 = await fileToBase64(file)
        } catch (error) {
          console.warn('[AcompSolemp] Falha ao ler anexo:', file.name, error)
        }
      }

      criados.push({
        id,
        pedidoId,
        nome: file.name,
        tipo: 'OUTRO',
        dataUpload: agora,
        tamanhoKb: Math.max(1, Math.round(file.size / 1024)),
        mimeType,
        storagePath,
        conteudoBase64,
      })
    }

    const anexosLeves = criados.map((arquivo) =>
      arquivo.storagePath
        ? { ...cloneAnexo(arquivo), conteudoBase64: undefined }
        : cloneAnexo(arquivo),
    )

    // Grava em snapshot fresco (após awaits de upload).
    const data = readData()
    writeAnexosIntoData(data, pedidoId, anexosLeves)
    saveAppData(data)

    const conferidos = this.listByPedido(pedidoId)
    if (conferidos.length === 0) {
      throw new Error('Os anexos não puderam ser gravados na planilha.')
    }

    if (falhasStorage.length > 0) {
      console.warn(
        '[AcompSolemp] Storage falhou para:',
        falhasStorage.join(', '),
        '— anexos salvos com fallback no AppData.',
      )
    }

    return criados
  },

  async download(arquivo: ArquivoAnexo): Promise<boolean> {
    if (arquivo.storagePath && useCloudAppDataSync()) {
      try {
        const client = getSupabaseClient()
        const { data, error } = await client.storage
          .from(STORAGE_BUCKET)
          .download(arquivo.storagePath)
        if (!error && data) {
          const url = URL.createObjectURL(data)
          const link = document.createElement('a')
          link.href = url
          link.download = arquivo.nome
          link.rel = 'noopener'
          document.body.appendChild(link)
          link.click()
          link.remove()
          URL.revokeObjectURL(url)
          return true
        }
        console.warn('[AcompSolemp] Download Storage falhou:', error?.message)
      } catch (error) {
        console.warn('[AcompSolemp] Download Storage indisponível:', error)
      }
    }

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
