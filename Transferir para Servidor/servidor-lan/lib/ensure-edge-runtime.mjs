import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

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

/**
 * O CLI sobe o edge runtime com RestartPolicy no. Depois de um restart do Docker
 * o container fica sem IP e o Kong responde "name resolution failed".
 * Não remove containers nem volumes.
 * @param {string} workdir
 */
export function ensureEdgeRuntimeRunning(workdir) {
  const ids = runDocker(['ps', '-aq', '--filter', 'name=supabase_edge_runtime_'])
    .split(/\s+/)
    .map((id) => id.trim())
    .filter(Boolean)

  const matched = []
  for (const id of ids) {
    const raw = runDocker(['inspect', id])
    const container = JSON.parse(raw)[0]
    const label = container?.Config?.Labels?.['com.supabase.cli.workdir'] ?? ''
    if (workdir && !samePath(label, workdir)) continue
    matched.push(container)
  }

  if (matched.length === 0) {
    throw new Error(
      'Container da Edge Function ausente para este projeto. Execute supabase start; este passo não recria o banco.',
    )
  }

  for (const container of matched) {
    const id = container.Id
    const name = container.Name.replace(/^\//, '')
    if (container.HostConfig?.RestartPolicy?.Name !== 'unless-stopped') {
      runDocker(['update', '--restart', 'unless-stopped', id])
      console.log(`[edge-runtime] restart unless-stopped: ${name}`)
    }
    if (container.State?.Status !== 'running') {
      runDocker(['start', id])
      console.log(`[edge-runtime] iniciado: ${name}`)
    } else {
      console.log(`[edge-runtime] já em execução: ${name}`)
    }
  }
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isCli) {
  const workdir = process.argv[2]
  if (!workdir) {
    console.error('Uso: node ensure-edge-runtime.mjs <workdir>')
    process.exit(1)
  }
  try {
    ensureEdgeRuntimeRunning(workdir)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
