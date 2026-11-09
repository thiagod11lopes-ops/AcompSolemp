import { STORAGE_KEYS, storageGet, storageRemove, storageSetAndWait } from '@/storage/indexedDb'

export interface EnvioAnexoDraftItem {
  name: string
  type: string
  lastModified: number
  /** Conteúdo em base64 (sem data-URL prefix) */
  base64: string
}

type DraftMap = Record<string, EnvioAnexoDraftItem[]>

function readMap(): DraftMap {
  try {
    const raw = storageGet(STORAGE_KEYS.ENVIO_ANEXOS_DRAFT)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as DraftMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

async function writeMap(map: DraftMap): Promise<void> {
  const keys = Object.keys(map)
  if (keys.length === 0) {
    storageRemove(STORAGE_KEYS.ENVIO_ANEXOS_DRAFT)
    return
  }
  await storageSetAndWait(STORAGE_KEYS.ENVIO_ANEXOS_DRAFT, JSON.stringify(map))
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler anexo'))
    reader.readAsDataURL(file)
  })
}

function base64ToFile(item: EnvioAnexoDraftItem): File {
  const binary = atob(item.base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], item.name, {
    type: item.type || 'application/octet-stream',
    lastModified: item.lastModified || Date.now(),
  })
}

/** Persiste anexos do modal Enviar (por clínica) — sobrevive a F5. */
export async function saveEnvioAnexosDraft(clinicaId: string, files: File[]): Promise<void> {
  if (!clinicaId) return
  const map = readMap()
  if (files.length === 0) {
    delete map[clinicaId]
    await writeMap(map)
    return
  }
  const items: EnvioAnexoDraftItem[] = []
  for (const file of files) {
    items.push({
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
      base64: await fileToBase64(file),
    })
  }
  map[clinicaId] = items
  await writeMap(map)
}

export async function loadEnvioAnexosDraft(clinicaId: string): Promise<File[]> {
  if (!clinicaId) return []
  // Garante leitura do IndexedDB após F5 (memória pode estar vazia até hydrate).
  try {
    const { storageReloadKey } = await import('@/storage/indexedDb')
    await storageReloadKey(STORAGE_KEYS.ENVIO_ANEXOS_DRAFT)
  } catch {
    /* ignore */
  }
  const items = readMap()[clinicaId] ?? []
  return items.map(base64ToFile)
}

export async function clearEnvioAnexosDraft(clinicaId: string): Promise<void> {
  if (!clinicaId) return
  const map = readMap()
  if (!(clinicaId in map)) return
  delete map[clinicaId]
  await writeMap(map)
}
