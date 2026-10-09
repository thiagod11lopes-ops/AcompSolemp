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

function assertInstallPath(installPath) {
  const p = path.normalize(String(installPath || ''))
  if (!p) throw new Error('Pasta de instalacao invalida.')
  if (fs.existsSync(p)) {
    const st = fs.statSync(p)
    if (!st.isDirectory()) {
      throw new Error(
        `O caminho "${p}" e um arquivo, nao uma pasta. Escolha uma pasta vazia ou outro nome.`,
      )
    }
  }
  return p
}

/** Remove instalacao anterior (evita ENOTDIR apos falha parcial). */
function prepareInstallDirectory(installPath) {
  if (fs.existsSync(installPath)) {
    fs.rmSync(installPath, { recursive: true, force: true })
  }
  fs.mkdirSync(installPath, { recursive: true })
}

function ensureDirectoryForFile(filePath) {
  const dir = path.dirname(filePath)
  if (dir === filePath || !dir) return
  if (fs.existsSync(dir)) {
    const st = fs.statSync(dir)
    if (!st.isDirectory()) {
      fs.unlinkSync(dir)
      fs.mkdirSync(dir, { recursive: true })
      return
    }
    return
  }
  ensureDirectoryForFile(dir)
  try {
    fs.mkdirSync(dir)
  } catch (err) {
    if (err && err.code !== 'EEXIST') throw err
  }
}

async function listFilesRecursive(dir, base = dir) {
  const out = []
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    let st
    try {
      st = fs.statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) out.push(...(await listFilesRecursive(full, base)))
    else out.push({ full, rel: path.relative(base, full), size: st.size })
  }
  return out
}

async function copyPayload({ resourcesPath, installPath, startUrl, onProgress }) {
  const target = assertInstallPath(installPath)
  const srcRoot = payloadRoot(resourcesPath)
  const files = await listFilesRecursive(srcRoot)
  const totalBytes = files.reduce((s, f) => s + f.size, 0) || 1
  let doneBytes = 0

  onProgress({ percent: 1, message: 'Preparando pasta de instalacao…' })
  try {
    prepareInstallDirectory(target)
  } catch (err) {
    if (err && err.code === 'EPERM') {
      throw new Error(
        `Sem permissao em "${target}". Escolha outra pasta (ex.: Documentos\\AcompOPMS).`,
      )
    }
    throw err
  }

  for (const f of files) {
    const rel = f.rel.split(/[/\\]/).join(path.sep)
    const dest = path.join(target, rel)
    ensureDirectoryForFile(dest)
    await fs.promises.copyFile(f.full, dest)
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(dest, 0o755)
      } catch {
        /* ignore */
      }
    }
    doneBytes += f.size
    const percent = Math.min(99, Math.round((doneBytes / totalBytes) * 100))
    onProgress({ percent, message: `Copiando ${rel}` })
  }

  const cfg = {
    startUrl,
    productName: 'AcompOPMS',
  }
  fs.writeFileSync(path.join(target, CONFIG_NAME), JSON.stringify(cfg, null, 2), 'utf8')

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

module.exports = { copyPayload, findLaunchBinary }
