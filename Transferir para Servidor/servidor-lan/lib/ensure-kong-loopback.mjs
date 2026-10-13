import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const HEALTH_URL = 'http://127.0.0.1:54321/auth/v1/health'

function runDocker(args) {
  const result = spawnSync('docker', args, { encoding: 'utf8' })
  if (result.status !== 0) {
    const detail = `${result.stderr || ''}${result.stdout || ''}`.trim()
    throw new Error(`docker ${args[0]} falhou: ${detail}`)
  }
  return result.stdout
}

function samePath(left, right) {
  return String(left).replaceAll('\\', '/').replace(/\/+$/, '').toLowerCase() ===
    String(right).replaceAll('\\', '/').replace(/\/+$/, '').toLowerCase()
}

async function kongHealthOk() {
  try {
    const response = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(4000) })
    return response.ok
  } catch {
    return false
  }
}

function kongContainerId(workdir) {
  const ids = runDocker(['ps', '-aq', '--filter', 'name=supabase_kong_'])
    .split(/\s+/)
    .map((id) => id.trim())
    .filter(Boolean)
  for (const id of ids) {
    const container = JSON.parse(runDocker(['inspect', id]))[0]
    const label = container?.Config?.Labels?.['com.supabase.cli.workdir'] ?? ''
    if (workdir && !samePath(label, workdir)) continue
    return id
  }
  return null
}

/**
 * O proxy do Docker Desktop às vezes escuta em 127.0.0.1:54321 e fecha a conexão
 * sem resposta. O Caddy então devolve 502 vazio e o login não mostra erro.
 * Reinicia só o container do Kong, sem apagar volume.
 * @param {string} workdir
 */
export async function ensureKongLoopback(workdir) {
  if (await kongHealthOk()) {
    console.log('[kong] loopback 54321 respondendo')
    return
  }

  const id = kongContainerId(workdir)
  if (!id) {
    throw new Error(
      'Kong não respondeu em 127.0.0.1:54321 e o container supabase_kong não foi encontrado.',
    )
  }

  console.log('[kong] 127.0.0.1:54321 sem resposta HTTP; reiniciando o container')
  runDocker(['restart', id])

  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    if (await kongHealthOk()) {
      console.log('[kong] loopback 54321 voltou a responder')
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error('Kong reiniciado, mas 127.0.0.1:54321/auth/v1/health continua sem resposta.')
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isCli) {
  const workdir = process.argv[2]
  if (!workdir) {
    console.error('Uso: node ensure-kong-loopback.mjs <workdir>')
    process.exit(1)
  }
  ensureKongLoopback(workdir).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
