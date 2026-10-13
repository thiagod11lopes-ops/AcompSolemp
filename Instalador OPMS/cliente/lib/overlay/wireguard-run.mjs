import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { buildWireGuardConf } from './wireguard-config.mjs'

function findBinary(candidates) {
  for (const cmd of candidates) {
    const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {
      encoding: 'utf8',
      windowsHide: true,
    })
    if (r.status === 0 && r.stdout?.trim()) {
      return r.stdout.trim().split('\n')[0]
    }
  }
  return null
}

function writeConf(installDir, conn) {
  const dir = join(installDir, 'wireguard')
  mkdirSync(dir, { recursive: true })
  const confPath = join(dir, 'acomopms.conf')
  writeFileSync(confPath, buildWireGuardConf(conn), { mode: 0o600 })
  return confPath
}

/**
 * @returns {{ status: 'active' | 'skipped' | 'failed', message: string, confPath?: string }}
 */
export function startWireGuardTunnel(installDir, conn) {
  if (process.env.ACOMOPMS_OVERLAY_SKIP === '1') {
    return { status: 'skipped', message: 'ACOMOPMS_OVERLAY_SKIP=1' }
  }

  const confPath = writeConf(installDir, conn)

  if (process.platform === 'win32') {
    const wireguard = findBinary(['wireguard.exe', 'wireguard'])
    if (!wireguard) {
      return {
        status: 'skipped',
        message:
          'WireGuard for Windows não encontrado. Instale WireGuard ou use apenas LAN até o pacote incluir o runtime (Etapa 13).',
        confPath,
      }
    }
    const r = spawnSync(wireguard, ['/installtunnelservice', confPath], {
      encoding: 'utf8',
      windowsHide: true,
    })
    if (r.status !== 0) {
      return {
        status: 'failed',
        message:
          r.stderr?.trim() ||
          'Não foi possível instalar o túnel (execute o instalador como Administrador ou configure manualmente em wireguard/acomopms.conf).',
        confPath,
      }
    }
    return { status: 'active', message: 'Túnel WireGuard (Windows)', confPath }
  }

  const wgQuick = findBinary(['wg-quick', 'wg'])
  if (!wgQuick || !wgQuick.includes('wg-quick')) {
    return {
      status: 'skipped',
      message:
        'wg-quick não encontrado. Linux: instale wireguard-tools ou use LAN. Conf gerada em wireguard/acomopms.conf.',
      confPath,
    }
  }
  const r = spawnSync('sudo', ['-n', 'wg-quick', 'up', confPath], {
    encoding: 'utf8',
    windowsHide: true,
  })
  if (r.status !== 0) {
    return {
      status: 'skipped',
      message:
        'wg-quick requer privilégios (sudo). Use LAN ou suba o túnel manualmente: sudo wg-quick up wireguard/acomopms.conf',
      confPath,
    }
  }
  return { status: 'active', message: 'Túnel WireGuard (Linux)', confPath }
}

export function stopWireGuardTunnel(installDir) {
  const confPath = join(installDir, 'wireguard', 'acomopms.conf')
  if (!existsSync(confPath)) return

  if (process.platform === 'win32') {
    const wireguard = findBinary(['wireguard.exe', 'wireguard'])
    if (wireguard) {
      spawnSync(wireguard, ['/uninstalltunnelservice', 'acomopms'], {
        encoding: 'utf8',
        windowsHide: true,
      })
    }
    return
  }
  spawnSync('sudo', ['-n', 'wg-quick', 'down', confPath], {
    encoding: 'utf8',
    windowsHide: true,
  })
}
