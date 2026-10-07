const DB_NAME = 'acomp_opms_db'
/** Banco legado (marca AcompSolemp) — migrado uma vez para acomp_opms_db. */
const LEGACY_DB_NAME = 'acomp_solemp_db'
const DB_VERSION = 1
const STORE_NAME = 'keyvalue'

/** Chaves migradas do localStorage para IndexedDB */
export const STORAGE_KEYS = {
  APP_DATA: 'acomp_opms_data',
  AUTH_LEGACY: 'acomp_opms_auth',
  AUTH_GESTOR: 'acomp_opms_auth_gestor',
  AUTH_CLINICA: 'acomp_opms_auth_clinica',
  AUTH_ORDENADOR: 'acomp_opms_auth_ordenador',
  AUTH_FINANCEIRO: 'acomp_opms_auth_financeiro',
  AUTH_DEMO_MODE: 'acomp_opms_auth_demo_mode',
  AUTH_OPEN_ACCESS: 'acomp_opms_auth_open_access',
  AUTH_IMPERSONATION: 'acomp_opms_auth_impersonation',
  DEMO_APP_DATA: 'acomp_opms_demo_data',
  THEME: 'acomp_opms_theme',
  TENANT_ID: 'acomp_opms_tenant_id',
  ORG_CODE: 'acomp_opms_org_code',
  /** Backup dos dados reais enquanto o seed fictício do dashboard está ativo */
  FICTIONAL_BACKUP: 'acomp_opms_fictional_backup',
  /** Snapshot dos dados fictícios (sobrevive a reload) */
  FICTIONAL_SNAPSHOT: 'acomp_opms_fictional_snapshot',
  FICTIONAL_ACTIVE: 'acomp_opms_fictional_active',
} as const

const ALL_KEYS = Object.values(STORAGE_KEYS)

/** Mapa chave antiga (AcompSolemp) → chave atual (AcompOPMS). */
const LEGACY_KEY_MAP: Record<string, string> = Object.fromEntries(
  ALL_KEYS.map((key) => [key.replace(/^acomp_opms_/, 'acomp_solemp_'), key]),
)

let dbPromise: Promise<IDBDatabase> | null = null
const memory = new Map<string, string>()
let initialized = false

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Falha ao abrir IndexedDB'))
  })

  return dbPromise
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Erro no IndexedDB'))
  })
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openDatabase()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const value = await idbRequest(store.get(key))
  return typeof value === 'string' ? value : null
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  await idbRequest(store.put(value, key))
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  await idbRequest(store.delete(key))
}

async function idbClear(): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  await idbRequest(store.clear())
}

async function readLegacyDbValue(legacyKey: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(LEGACY_DB_NAME)
      request.onerror = () => resolve(null)
      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.close()
          resolve(null)
          return
        }
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const getReq = store.get(legacyKey)
        getReq.onsuccess = () => {
          const value = getReq.result
          db.close()
          resolve(typeof value === 'string' ? value : null)
        }
        getReq.onerror = () => {
          db.close()
          resolve(null)
        }
      }
    } catch {
      resolve(null)
    }
  })
}

async function migrateFromLegacyBrandStorage(): Promise<void> {
  for (const [legacyKey, nextKey] of Object.entries(LEGACY_KEY_MAP)) {
    const existing = await idbGet(nextKey)
    if (existing !== null) continue

    const fromLegacyDb = await readLegacyDbValue(legacyKey)
    if (fromLegacyDb !== null) {
      await idbSet(nextKey, fromLegacyDb)
      continue
    }

    const fromLocal = localStorage.getItem(legacyKey)
    if (fromLocal !== null) {
      await idbSet(nextKey, fromLocal)
      localStorage.removeItem(legacyKey)
    }
  }
}

async function migrateFromLocalStorage(): Promise<void> {
  for (const key of ALL_KEYS) {
    const existing = await idbGet(key)
    if (existing !== null) continue

    const legacy = localStorage.getItem(key)
    if (legacy === null) continue

    await idbSet(key, legacy)
    localStorage.removeItem(key)
  }
}

async function hydrateMemory(): Promise<void> {
  memory.clear()
  for (const key of ALL_KEYS) {
    const value = await idbGet(key)
    if (value !== null) memory.set(key, value)
  }
}

const INIT_TIMEOUT_MS = 8_000

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

/** Inicializa IndexedDB, migra localStorage e hidrata o cache em memória */
export async function initStorage(): Promise<void> {
  if (initialized) return
  try {
    await withTimeout(openDatabase(), INIT_TIMEOUT_MS, 'Tempo esgotado ao abrir o armazenamento local')
    await migrateFromLegacyBrandStorage()
    await migrateFromLocalStorage()
    await hydrateMemory()
  } catch (error) {
    console.warn('IndexedDB indisponível; usando cache em memória.', error)
    memory.clear()
    for (const key of ALL_KEYS) {
      const current = localStorage.getItem(key)
      if (current !== null) {
        memory.set(key, current)
        continue
      }
      const legacyKey = key.replace(/^acomp_opms_/, 'acomp_solemp_')
      const legacy = localStorage.getItem(legacyKey)
      if (legacy !== null) memory.set(key, legacy)
    }
  }
  initialized = true
}

export function isStorageReady(): boolean {
  return initialized
}

export function storageGet(key: string): string | null {
  return memory.get(key) ?? null
}

export function storageSet(key: string, value: string): void {
  memory.set(key, value)
  void idbSet(key, value).catch((err) => {
    console.error('Falha ao gravar no IndexedDB', key, err)
  })
}

/** Grava na memória e aguarda a persistência no IndexedDB. */
export async function storageSetAndWait(key: string, value: string): Promise<void> {
  memory.set(key, value)
  try {
    await idbSet(key, value)
  } catch (err) {
    console.error('Falha ao gravar no IndexedDB', key, err)
    throw err
  }
}

/** Recarrega uma chave do IndexedDB para o cache em memória desta aba. */
export async function storageReloadKey(key: string): Promise<string | null> {
  try {
    const value = await idbGet(key)
    if (value !== null) memory.set(key, value)
    else memory.delete(key)
    return value
  } catch (err) {
    console.error('Falha ao recarregar do IndexedDB', key, err)
    return memory.get(key) ?? null
  }
}

export function storageRemove(key: string): void {
  memory.delete(key)
  void idbDelete(key).catch((err) => {
    console.error('Falha ao remover do IndexedDB', key, err)
  })
}

/** Remove da memória e aguarda exclusão no IndexedDB. */
export async function storageRemoveAndWait(key: string): Promise<void> {
  memory.delete(key)
  try {
    await idbDelete(key)
  } catch (err) {
    console.error('Falha ao remover do IndexedDB', key, err)
    throw err
  }
}

export async function storageClearAll(): Promise<void> {
  memory.clear()
  await idbClear()
}
