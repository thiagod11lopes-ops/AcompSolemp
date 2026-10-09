const fs = require('fs')
const os = require('os')
const path = require('path')

const CONFIG_NAME = 'acomopms-desktop.config.json'

function safeLstat(p) {
  try {
    return fs.lstatSync(p)
  } catch {
    return null
  }
}

function isStatDirectory(st) {
  return Boolean(st && typeof st.isDirectory === 'function' && st.isDirectory())
}

function isStatFile(st) {
  return Boolean(st && typeof st.isFile === 'function' && st.isFile())
}

function expandWinEnv(p) {
  if (process.platform !== 'win32') return p
  return String(p)
    .replace(/%LOCALAPPDATA%/gi, process.env.LOCALAPPDATA || '')
    .replace(/%APPDATA%/gi, process.env.APPDATA || '')
    .replace(/%USERPROFILE%/gi, process.env.USERPROFILE || '')
}

function normalizeTargetPath(installPath) {
  return path.normalize(expandWinEnv(String(installPath || '').trim()))
}

/** Caminho absoluto (portable roda em Temp — relativo quebra stat/cópia). */
function resolveInstallPath(installPath) {
  let p = normalizeTargetPath(installPath)
  if (!p) throw new Error('Pasta de instalacao invalida.')
  if (!path.isAbsolute(p)) {
    if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
      p = path.resolve(process.env.LOCALAPPDATA, p)
    } else {
      p = path.resolve(p)
    }
  }
  return path.normalize(p)
}

function payloadRoot(resourcesPath) {
  const a = path.join(resourcesPath, 'client-payload')
  const b = path.join(resourcesPath, 'app', 'client-payload')
  if (isStatDirectory(safeLstat(a))) return a
  if (isStatDirectory(safeLstat(b))) return b
  throw new Error('Pacote do cliente não encontrado. Gere o instalador com scripts/build-tudo.')
}

/** Evita instalar em AppData\\Local inteiro (conflito com pastas como locales). */
function rejectDangerousInstallRoot(installPath) {
  if (process.platform !== 'win32') return
  const p = installPath.toLowerCase()
  const local = process.env.LOCALAPPDATA && path.normalize(process.env.LOCALAPPDATA).toLowerCase()
  const roaming = process.env.APPDATA && path.normalize(process.env.APPDATA).toLowerCase()
  const home = process.env.USERPROFILE && path.normalize(process.env.USERPROFILE).toLowerCase()
  if (local && p === local) {
    throw new Error(
      'Pasta invalida: nao instale direto em AppData\\Local. Use ...\\AppData\\Local\\AcompOPMS (botao padrao).',
    )
  }
  if (roaming && p === roaming) {
    throw new Error('Pasta invalida: use ...\\AppData\\Local\\AcompOPMS, nao AppData\\Roaming.')
  }
  if (home && p === home) {
    throw new Error('Pasta invalida: escolha uma subpasta, ex.: Documentos\\AcompOPMS.')
  }
}

function assertInstallPath(installPath) {
  const p = resolveInstallPath(installPath)
  rejectDangerousInstallRoot(p)
  const st = safeLstat(p)
  if (st && !isStatDirectory(st)) {
    throw new Error(
      `O caminho "${p}" e um arquivo, nao uma pasta. Escolha outra pasta (ex.: ...\\AcompOPMS).`,
    )
  }
  return p
}

function rmDirSafe(dir) {
  if (!dir) return
  const st = safeLstat(dir)
  if (!st) return
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
  } catch (err) {
    if (err && err.code === 'EPERM') {
      throw new Error(
        `Nao foi possivel substituir "${dir}". Feche o AcompOPMS e o instalador antigo e tente de novo.`,
      )
    }
    throw err
  }
}

function newStagingPath() {
  return path.join(os.tmpdir(), `acomopms-staging-${process.pid}-${Date.now()}`)
}

function wrapCopyError(err, context) {
  const code = err && err.code ? err.code : ''
  const msg = err && err.message ? err.message : String(err)
  if (/isDirectory/i.test(msg) && /null/i.test(msg)) {
    return new Error(
      `${context} Caminho invalido ao copiar. Use o caminho completo ...\\AppData\\Local\\AcompOPMS (nao edite para AppData\\Local sozinho).`,
    )
  }
  if (code === 'ENOTDIR') {
    return new Error(
      `${context} Caminho bloqueado (ENOTDIR). Apague a pasta AcompOPMS e tente de novo. Detalhe: ${msg}`,
    )
  }
  if (code === 'EPERM' || code === 'EACCES') {
    return new Error(`${context} Sem permissao. Escolha Documentos\\AcompOPMS ou feche programas que usam a pasta.`)
  }
  return new Error(`${context} ${msg}`)
}

async function listFilesRecursive(dir, base = dir) {
  const out = []
  if (!isStatDirectory(safeLstat(dir))) return out
  for (const name of fs.readdirSync(dir)) {
    if (name === '.' || name === '..') continue
    const full = path.join(dir, name)
    const st = safeLstat(full)
    if (!st) continue
    if (isStatDirectory(st)) out.push(...(await listFilesRecursive(full, base)))
    else if (isStatFile(st)) out.push({ full, rel: path.relative(base, full), size: st.size })
  }
  return out
}

async function copyTreeWithProgress(srcRoot, destRoot, onProgress) {
  const files = await listFilesRecursive(srcRoot)
  files.sort((a, b) => a.rel.length - b.rel.length)
  const totalBytes = files.reduce((s, f) => s + f.size, 0) || 1
  let doneBytes = 0

  rmDirSafe(destRoot)
  fs.mkdirSync(destRoot, { recursive: true })

  for (const f of files) {
    const rel = f.rel.split(/[/\\]/).join(path.sep)
    const dest = path.join(destRoot, rel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    try {
      await fs.promises.copyFile(f.full, dest)
    } catch (err) {
      throw wrapCopyError(err, `Falha ao copiar ${rel}.`)
    }
    doneBytes += f.size
    const percent = Math.min(88, Math.round((doneBytes / totalBytes) * 80) + 8)
    onProgress({ percent, message: `Copiando ${rel}` })
  }
}

async function copyPayloadToStaging(srcRoot, staging, onProgress) {
  onProgress({ percent: 5, message: 'Copiando arquivos…' })
  try {
    await fs.promises.cp(srcRoot, staging, { recursive: true, force: true, dereference: true })
    onProgress({ percent: 85, message: 'Arquivos copiados.' })
  } catch (err) {
    onProgress({ percent: 6, message: 'Copiando arquivo por arquivo…' })
    await copyTreeWithProgress(srcRoot, staging, onProgress)
  }
}

async function copyPayload({ resourcesPath, installPath, startUrl, onProgress }) {
  const target = assertInstallPath(installPath)
  const srcRoot = payloadRoot(resourcesPath)
  const staging = newStagingPath()

  onProgress({ percent: 1, message: 'Preparando instalacao limpa…' })
  rmDirSafe(staging)
  fs.mkdirSync(staging, { recursive: true })

  try {
    await copyPayloadToStaging(srcRoot, staging, onProgress)
  } catch (err) {
    rmDirSafe(staging)
    throw err
  }

  const cfg = {
    startUrl,
    productName: 'AcompOPMS',
  }
  try {
    fs.writeFileSync(path.join(staging, CONFIG_NAME), JSON.stringify(cfg, null, 2), 'utf8')
  } catch (err) {
    rmDirSafe(staging)
    throw wrapCopyError(err, 'Falha ao gravar configuracao.')
  }

  onProgress({ percent: 92, message: 'Substituindo pasta de destino…' })
  rmDirSafe(target)
  try {
    fs.renameSync(staging, target)
  } catch (err) {
    try {
      fs.mkdirSync(target, { recursive: true })
      await copyTreeWithProgress(staging, target, onProgress)
      rmDirSafe(staging)
    } catch (err2) {
      rmDirSafe(staging)
      throw wrapCopyError(err2, 'Falha ao mover arquivos para a pasta final.')
    }
  }

  onProgress({ percent: 100, message: 'Concluido' })

  const launchBinary = findLaunchBinary(target)
  return { installPath: target, launchBinary }
}

function findLaunchBinary(installPath) {
  if (!isStatDirectory(safeLstat(installPath))) return null
  if (process.platform === 'win32') {
    const exe = path.join(installPath, 'AcompOPMS.exe')
    if (fs.existsSync(exe)) return exe
    for (const name of fs.readdirSync(installPath)) {
      if (name.endsWith('.exe') && !name.toLowerCase().includes('install')) {
        return path.join(installPath, name)
      }
    }
  } else {
    const candidates = ['acomopms-desktop', 'AcompOPMS', 'electron']
    for (const c of candidates) {
      const p = path.join(installPath, c)
      if (fs.existsSync(p)) return p
    }
  }
  return null
}

module.exports = { copyPayload, findLaunchBinary, assertInstallPath, resolveInstallPath }
