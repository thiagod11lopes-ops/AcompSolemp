const fs = require('fs')
const path = require('path')

const CONFIG_NAME = 'acomopms-desktop.config.json'

function payloadRoot(resourcesPath) {
  const a = path.join(resourcesPath, 'client-payload')
  const b = path.join(resourcesPath, 'app', 'client-payload')
  if (fs.existsSync(a)) return a
  if (fs.existsSync(b)) return b
  throw new Error('Pacote do cliente não encontrado. Gere o instalador com scripts/build-tudo.')
}

function normalizeTargetPath(installPath) {
  return path.normalize(String(installPath || '').trim())
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
  const p = normalizeTargetPath(installPath)
  if (!p) throw new Error('Pasta de instalacao invalida.')
  rejectDangerousInstallRoot(p)
  if (fs.existsSync(p)) {
    const st = fs.lstatSync(p)
    if (!st.isDirectory()) {
      throw new Error(
        `O caminho "${p}" e um arquivo, nao uma pasta. Escolha outra pasta (ex.: ...\\AcompOPMS).`,
      )
    }
  }
  return p
}

function rmDirSafe(dir) {
  if (!fs.existsSync(dir)) return
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

function stagingPathFor(target) {
  const parent = path.dirname(target)
  const leaf = path.basename(target) || 'AcompOPMS'
  return path.join(parent, `.${leaf}-opms-staging`)
}

function ensureDirectoryForFile(filePath) {
  const dir = path.dirname(filePath)
  if (!dir || dir === filePath) return
  if (fs.existsSync(dir)) {
    const st = fs.lstatSync(dir)
    if (!st.isDirectory()) {
      fs.unlinkSync(dir)
      fs.mkdirSync(dir, { recursive: true })
      return
    }
    return
  }
  ensureDirectoryForFile(dir)
  fs.mkdirSync(dir, { recursive: true })
}

function wrapCopyError(err, context) {
  const code = err && err.code ? err.code : ''
  const msg = err && err.message ? err.message : String(err)
  if (code === 'ENOTDIR') {
    return new Error(
      `${context} Caminho bloqueado (ENOTDIR). Feche o AcompOPMS, apague a pasta de destino e use ...\\AcompOPMS — nao AppData\\Local sozinho. Detalhe: ${msg}`,
    )
  }
  if (code === 'EPERM' || code === 'EACCES') {
    return new Error(`${context} Sem permissao. Escolha Documentos\\AcompOPMS ou feche programas que usam a pasta.`)
  }
  return new Error(`${context} ${msg}`)
}

async function listFilesRecursive(dir, base = dir) {
  const out = []
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    let st
    try {
      st = fs.lstatSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) out.push(...(await listFilesRecursive(full, base)))
    else if (st.isFile()) out.push({ full, rel: path.relative(base, full), size: st.size })
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
    ensureDirectoryForFile(dest)
    try {
      await fs.promises.copyFile(f.full, dest)
    } catch (err) {
      throw wrapCopyError(err, `Falha ao copiar ${rel}.`)
    }
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(dest, 0o755)
      } catch {
        /* ignore */
      }
    }
    doneBytes += f.size
    const percent = Math.min(92, Math.round((doneBytes / totalBytes) * 90) + 5)
    onProgress({ percent, message: `Copiando ${rel}` })
  }
}

async function copyPayload({ resourcesPath, installPath, startUrl, onProgress }) {
  const target = assertInstallPath(installPath)
  const srcRoot = payloadRoot(resourcesPath)
  const staging = stagingPathFor(target)

  onProgress({ percent: 1, message: 'Preparando instalacao limpa…' })
  rmDirSafe(staging)

  try {
    await copyTreeWithProgress(srcRoot, staging, onProgress)
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

  onProgress({ percent: 96, message: 'Substituindo pasta de destino…' })
  rmDirSafe(target)
  try {
    fs.renameSync(staging, target)
  } catch (err) {
    try {
      await fs.promises.cp(staging, target, { recursive: true, force: true })
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

module.exports = { copyPayload, findLaunchBinary, assertInstallPath, rejectDangerousInstallRoot }
