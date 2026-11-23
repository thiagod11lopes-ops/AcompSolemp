import { spawnSync } from 'node:child_process'

function runWg(args, input) {
  const r = spawnSync('wg', args, {
    encoding: 'utf8',
    input,
    windowsHide: true,
  })
  if (r.status !== 0) {
    throw new Error(r.stderr?.trim() || 'Comando wg falhou — instale WireGuard/wireguard-tools')
  }
  return (r.stdout || '').trim()
}

export function generateWireGuardKeyPair() {
  const privateKey = runWg(['genkey'])
  const publicKey = runWg(['pubkey'], privateKey)
  return { privateKey, publicKey }
}

export function isWireGuardCliAvailable() {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['wg'], {
    encoding: 'utf8',
    windowsHide: true,
  })
  return r.status === 0
}
