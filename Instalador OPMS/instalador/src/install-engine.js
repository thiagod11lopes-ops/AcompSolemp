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

async function listFilesRecursive(dir, base = dir) {
  const out = []
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) out.push(...(await listFilesRecursive(full, base)))
    else out.push({ full, rel: path.relative(base, full), size: st.size })
  }
  return out
}

async function copyPayload({ resourcesPath, installPath, startUrl, onProgress }) {
  const srcRoot = payloadRoot(resourcesPath)
  const files = await listFilesRecursive(srcRoot)
  const totalBytes = files.reduce((s, f) => s + f.size, 0) || 1
  let doneBytes = 0

  try {
    fs.mkdirSync(installPath, { recursive: true })
  } catch (err) {
    if (err && err.code === 'EPERM') {
      throw new Error(
        `Sem permissao para criar "${installPath}". Escolha outra pasta (ex.: Documentos\\AcompOPMS) ou execute o instalador como Administrador.`,
      )
    }
    throw err
  }

  for (const f of files) {
    const dest = path.join(installPath, f.rel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
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
    onProgress({ percent, message: `Copiando ${f.rel}` })
  }

  const cfg = {
    startUrl,
    productName: 'AcompOPMS',
  }
  fs.writeFileSync(path.join(installPath, CONFIG_NAME), JSON.stringify(cfg, null, 2), 'utf8')

  onProgress({ percent: 100, message: 'Concluído' })

  const launchBinary = findLaunchBinary(installPath)
  return { installPath, launchBinary }
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
