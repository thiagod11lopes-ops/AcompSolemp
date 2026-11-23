import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/** Rede Docker cuja publicação de portas fica só em loopback. */
export const SUPABASE_LOOPBACK_NETWORK = 'acomopms-supabase-loopback'

const IPV4_OPTION = 'com.docker.network.bridge.host_binding_ipv4'
const IPV6_OPTION = 'com.docker.network.bridge.host_binding_ipv6'

/** Docker Desktop 4.94 persiste a chave em PascalCase. */
const DOCKER_DESKTOP_BINDING_KEY = 'PortBindingBehavior'
const DOCKER_DESKTOP_LOCAL_ONLY_BINDING = 'local-only-port-binding'

function runDocker(args) {
  return spawnSync('docker', args, { encoding: 'utf8' })
}

function dockerDesktopSettingsPath() {
  const appData = process.env.APPDATA
  if (!appData) return null
  return join(appData, 'Docker', 'settings-store.json')
}

/**
 * No Windows, o proxy do Docker Desktop escuta em todas as interfaces mesmo com
 * a rede de loopback. local-only faz o proxy usar 127.0.0.1.
 * @returns {boolean} true quando o arquivo mudou e o Docker Desktop precisa reiniciar
 */
export function ensureDockerDesktopLocalOnlyPortBinding() {
  if (process.platform !== 'win32') return false
  const path = dockerDesktopSettingsPath()
  if (!path) {
    throw new Error('APPDATA ausente; nao foi possivel ajustar o Docker Desktop.')
  }
  const current = JSON.parse(readFileSync(path, 'utf8'))
  if (current[DOCKER_DESKTOP_BINDING_KEY] === DOCKER_DESKTOP_LOCAL_ONLY_BINDING) return false
  current[DOCKER_DESKTOP_BINDING_KEY] = DOCKER_DESKTOP_LOCAL_ONLY_BINDING
  delete current.portBindingBehavior
  writeFileSync(path, `${JSON.stringify(current, null, 2)}\n`, 'utf8')
  return true
}

/**
 * Cria a rede se ela ainda não existe. Não remove redes, containers nem volumes.
 * @returns {string}
 */
export function ensureSupabaseLoopbackNetwork() {
  ensureDockerDesktopLocalOnlyPortBinding()
  const inspect = runDocker(['network', 'inspect', SUPABASE_LOOPBACK_NETWORK])
  if (inspect.status === 0) {
    const data = JSON.parse(inspect.stdout)
    const options = data[0]?.Options ?? {}
    if (options[IPV4_OPTION] !== '127.0.0.1') {
      throw new Error(
        `A rede ${SUPABASE_LOOPBACK_NETWORK} existe sem ${IPV4_OPTION}=127.0.0.1.`,
      )
    }
    return SUPABASE_LOOPBACK_NETWORK
  }

  const created = runDocker([
    'network',
    'create',
    '-o',
    `${IPV4_OPTION}=127.0.0.1`,
    '-o',
    `${IPV6_OPTION}=::1`,
    SUPABASE_LOOPBACK_NETWORK,
  ])
  if (created.status !== 0) {
    const detail = `${created.stderr || ''}${created.stdout || ''}`.trim()
    throw new Error(`docker network create ${SUPABASE_LOOPBACK_NETWORK} falhou: ${detail}`)
  }
  return SUPABASE_LOOPBACK_NETWORK
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isCli) {
  try {
    console.log(ensureSupabaseLoopbackNetwork())
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
