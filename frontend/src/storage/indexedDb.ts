const DB_NAME = 'acomp_solemp_db'
const DB_VERSION = 1
const STORE_NAME = 'keyvalue'

/** Chaves migradas do localStorage para IndexedDB */
export const STORAGE_KEYS = {
  APP_DATA: 'acomp_solemp_data',
  AUTH_LEGACY: 'acomp_solemp_auth',
  AUTH_GESTOR: 'acomp_solemp_auth_gestor',
  AUTH_CLINICA: 'acomp_solemp_auth_clinica',
  AUTH_ORDENADOR: 'acomp_solemp_auth_ordenador',
  AUTH_FINANCEIRO: 'acomp_solemp_auth_financeiro',
  AUTH_DEMO_MODE: 'acomp_solemp_auth_demo_mode',
  DEMO_APP_DATA: 'acomp_solemp_demo_data',
  THEME: 'acomp_solemp_theme',
  TENANT_ID: 'acomp_solemp_tenant_id',
  ORG_CODE: 'acomp_solemp_org_code',
} as const

const ALL_KEYS = Object.values(STORAGE_KEYS)

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
    await migrateFromLocalStorage()
    await hydrateMemory()
  } catch (error) {
    console.warn('IndexedDB indisponível; usando cache em memória.', error)
    memory.clear()
    for (const key of ALL_KEYS) {
      const legacy = localStorage.getItem(key)
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

export function storageRemove(key: string): void {
  memory.delete(key)
  void idbDelete(key).catch((err) => {
    console.error('Falha ao remover do IndexedDB', key, err)
  })
}

export async function storageClearAll(): Promise<void> {
  memory.clear()
  await idbClear()
}
