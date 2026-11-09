const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

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

function rejectDangerousInstallRoot(installPath) {
  if (process.platform !== 'win32') return
  const p = installPath.toLowerCase()
  const local = process.env.LOCALAPPDATA && path.normalize(process.env.LOCALAPPDATA).toLowerCase()
  const roaming = process.env.APPDATA && path.normalize(process.env.APPDATA).toLowerCase()
  const home = process.env.USERPROFILE && path.normalize(process.env.USERPROFILE).toLowerCase()
  if (local && p === local) {
    throw new Error(
      'Pasta invalida: nao instale direto em AppData\\Local. Use ...\\AppData\\Local\\AcompOPMS.',
    )
  }
  if (roaming && p === roaming) {
    throw new Error('Pasta invalida: use ...\\AppData\\Local\\AcompOPMS.')
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
    throw new Error(`O caminho "${p}" e um arquivo, nao uma pasta.`)
  }
  return p
}

function rmDirBestEffort(dir) {
  if (!dir || !safeLstat(dir)) return
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 })
  } catch (err) {
    writeInstallLog(['rm-best-effort', dir, err && err.code, err && err.message])
  }
}

function tryReleaseWindowsLocks() {
  if (process.platform !== 'win32') return
  for (const image of ['AcompOPMS.exe']) {
    spawnSync('taskkill', ['/IM', image, '/F', '/T'], { windowsHide: true })
  }
}

function cleanupOldInstallBackups(parentDir, baseName) {
  if (!isStatDirectory(safeLstat(parentDir))) return
  for (const name of fs.readdirSync(parentDir)) {
    if (!name.startsWith(`${baseName}.old-`)) continue
    rmDirBestEffort(path.join(parentDir, name))
  }
}

/** Renomeia instalacao anterior em vez de apagar (evita EBUSY no Explorer/antivirus). */
function retireExistingInstall(target) {
  if (!safeLstat(target)) return null
  const parent = path.dirname(target)
  const base = path.basename(target)
  cleanupOldInstallBackups(parent, base)
  const backup = path.join(parent, `${base}.old-${Date.now()}`)
  try {
    fs.renameSync(target, backup)
    writeInstallLog(['retire-ok', backup])
    rmDirBestEffort(backup)
    return backup
  } catch (err) {
    writeInstallLog(['retire-rename-failed', err && err.code, err && err.message])
    return null
  }
}

function cleanupLegacyPaths() {
  if (process.platform !== 'win32' || !process.env.LOCALAPPDATA) return
  rmDirBestEffort(path.join(process.env.LOCALAPPDATA, '.AcompOPMS-opms-staging'))
  cleanupOldInstallBackups(process.env.LOCALAPPDATA, 'AcompOPMS')
}

function newStagingPath() {
  return path.join(os.tmpdir(), `acomopms-staging-${process.pid}-${Date.now()}`)
}

function installLogPath() {
  return path.join(os.tmpdir(), 'acomopms-install.log')
}

function writeInstallLog(lines) {
  try {
    fs.appendFileSync(installLogPath(), `${new Date().toISOString()} ${lines.join(' ')}\n`, 'utf8')
  } catch {
    /* ignore */
  }
}

function wrapCopyError(err, context) {
  const code = err && err.code ? err.code : ''
  const msg = err && err.message ? err.message : String(err)
  const logHint = ` Log: ${installLogPath()}`
  if (code === 'ENOTDIR') {
    return new Error(
      `${context} (ENOTDIR) Conflito de pasta/arquivo — apague .AcompOPMS-opms-staging em AppData\\Local se existir.${logHint} ${msg}`,
    )
  }
  if (code === 'EPERM' || code === 'EACCES' || code === 'EBUSY') {
    return new Error(
      `${context} Arquivo em uso — feche o AcompOPMS e o instalador antigo antes de reinstalar.${logHint}`,
    )
  }
  return new Error(`${context}${logHint} ${msg}`)
}

function ensureParentDir(filePath) {
  const dir = path.dirname(filePath)
  if (!dir || dir === filePath) return
  ensureParentDir(dir)
  if (fs.existsSync(dir)) {
    const st = safeLstat(dir)
    if (st && !isStatDirectory(st)) fs.unlinkSync(dir)
  }
  fs.mkdirSync(dir, { recursive: true })
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

function robocopyTree(srcRoot, destRoot) {
  fs.mkdirSync(destRoot, { recursive: true })
  const r = spawnSync(
    'robocopy',
    [
      path.normalize(srcRoot),
      path.normalize(destRoot),
      '/E',
      '/COPY:DAT',
      '/DCOPY:DAT',
      '/R:2',
      '/W:2',
      '/NFL',
      '/NDL',
      '/NJH',
      '/NJS',
      '/NC',
      '/NS',
    ],
    { encoding: 'utf8', windowsHide: true },
  )
  const code = r.status
  if (code === null) {
    throw Object.assign(new Error('robocopy nao encontrado no Windows'), { code: 'ENOENT' })
  }
  if (code >= 8) {
    const detail = (r.stderr || r.stdout || '').trim().slice(0, 400)
    throw Object.assign(new Error(`robocopy falhou (codigo ${code}). ${detail}`), { code: 'EROBOCOPY' })
  }
}

async function copyTreeWithProgress(srcRoot, destRoot, onProgress) {
  const files = await listFilesRecursive(srcRoot)
  files.sort((a, b) => {
    const da = a.rel.split(/[/\\]/).length
    const db = b.rel.split(/[/\\]/).length
    return da - db || a.rel.localeCompare(b.rel)
  })
  const totalBytes = files.reduce((s, f) => s + f.size, 0) || 1
  let doneBytes = 0

  rmDirBestEffort(destRoot)
  fs.mkdirSync(destRoot, { recursive: true })

  for (const f of files) {
    const rel = f.rel.split(/[/\\]/).join(path.sep)
    const dest = path.join(destRoot, rel)
    ensureParentDir(dest)
    try {
      await fs.promises.copyFile(f.full, dest)
    } catch (err) {
      writeInstallLog(['copyFile', rel, err.code, err.message])
      throw wrapCopyError(err, `Falha ao copiar ${rel}.`)
    }
    doneBytes += f.size
    const percent = Math.min(88, Math.round((doneBytes / totalBytes) * 80) + 8)
    onProgress({ percent, message: `Copiando ${rel}` })
  }
}

async function copyPayloadToStaging(srcRoot, staging, onProgress) {
  rmDirBestEffort(staging)
  onProgress({ percent: 5, message: 'Copiando arquivos…' })

  if (process.platform === 'win32') {
    try {
      robocopyTree(srcRoot, staging)
      onProgress({ percent: 85, message: 'Arquivos copiados.' })
      return
    } catch (err) {
      writeInstallLog(['robocopy', err.code, err.message])
      rmDirBestEffort(staging)
    }
  }

  try {
    await fs.promises.cp(srcRoot, staging, { recursive: true, force: true, dereference: true })
    onProgress({ percent: 85, message: 'Arquivos copiados.' })
  } catch (err) {
    writeInstallLog(['fs.cp', err.code, err.message])
    rmDirBestEffort(staging)
    onProgress({ percent: 6, message: 'Copiando arquivo por arquivo…' })
    await copyTreeWithProgress(srcRoot, staging, onProgress)
  }
}

function assertPayloadLayout(staging) {
  const exe = path.join(staging, 'AcompOPMS.exe')
  if (fs.existsSync(exe)) return
  const nested = path.join(staging, 'client-payload', 'AcompOPMS.exe')
  if (fs.existsSync(nested)) {
    throw new Error(
      'Layout do pacote incorreto (client-payload aninhado). Use instalador v1.0.5 ou mais recente.',
    )
  }
  throw new Error('AcompOPMS.exe nao encontrado apos copia. Payload incompleto.')
}

function targetInstallLooksValid(target) {
  return fs.existsSync(path.join(target, 'AcompOPMS.exe'))
}

async function promoteStagingToTarget(staging, target, onProgress) {
  tryReleaseWindowsLocks()
  retireExistingInstall(target)

  if (!safeLstat(target)) {
    try {
      fs.renameSync(staging, target)
      return
    } catch (err) {
      writeInstallLog(['rename-staging', err && err.code, err && err.message])
    }
  }

  onProgress({ percent: 94, message: 'Atualizando arquivos na pasta de destino…' })
  fs.mkdirSync(target, { recursive: true })
  if (process.platform === 'win32') {
    robocopyTree(staging, target)
  } else {
    await copyTreeWithProgress(staging, target, onProgress)
  }
  rmDirBestEffort(staging)

  if (!targetInstallLooksValid(target)) {
    throw new Error(
      'Instalacao incompleta: AcompOPMS.exe nao encontrado. Feche janelas do Explorador abertas em AppData\\Local\\AcompOPMS, reinicie o PC e tente de novo.',
    )
  }
}

async function copyPayload({ resourcesPath, installPath, startUrl, onProgress }) {
  tryReleaseWindowsLocks()
  cleanupLegacyPaths()
  const target = assertInstallPath(installPath)
  const srcRoot = payloadRoot(resourcesPath)
  const staging = newStagingPath()

  writeInstallLog(['start', 'src=', srcRoot, 'target=', target, 'staging=', staging])

  onProgress({ percent: 1, message: 'Preparando instalacao limpa…' })

  try {
    await copyPayloadToStaging(srcRoot, staging, onProgress)
    assertPayloadLayout(staging)
  } catch (err) {
    rmDirBestEffort(staging)
    throw err
  }

  const cfg = { startUrl, productName: 'AcompOPMS' }
  try {
    fs.writeFileSync(path.join(staging, CONFIG_NAME), JSON.stringify(cfg, null, 2), 'utf8')
  } catch (err) {
    rmDirBestEffort(staging)
    throw wrapCopyError(err, 'Falha ao gravar configuracao.')
  }

  onProgress({ percent: 92, message: 'Substituindo pasta de destino…' })
  try {
    await promoteStagingToTarget(staging, target, onProgress)
  } catch (err) {
    rmDirBestEffort(staging)
    if (targetInstallLooksValid(target)) {
      writeInstallLog(['promote-warning', err.message, 'target-ok'])
      onProgress({ percent: 100, message: 'Concluido (limpeza temporaria pendente)' })
    } else {
      throw wrapCopyError(err, 'Falha ao mover para pasta final.')
    }
  }

  onProgress({ percent: 100, message: 'Concluido' })
  writeInstallLog(['done', target])

  const launchBinary = findLaunchBinary(target)
  return { installPath: target, launchBinary }
}

function findLaunchBinary(installPath) {
  if (!isStatDirectory(safeLstat(installPath))) return null
  const exe = path.join(installPath, 'AcompOPMS.exe')
  if (fs.existsSync(exe)) return exe
  if (process.platform === 'win32') {
    for (const name of fs.readdirSync(installPath)) {
      if (name.endsWith('.exe') && !name.toLowerCase().includes('install')) {
        return path.join(installPath, name)
      }
    }
  }
  return null
}

module.exports = { copyPayload, findLaunchBinary, assertInstallPath, resolveInstallPath }
