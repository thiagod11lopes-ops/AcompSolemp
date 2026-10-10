#!/usr/bin/env node
/**
 * Etapa 15 — verifica se portas internas Supabase não respondem via IP LAN.
 * Uso: node verificar-seguranca-lan.mjs [--json] [--skip-probe]
 */
import net from 'node:net'
import { loadServidorEnv } from './lib/load-servidor-env.mjs'
import { getInternalSupabaseTcpPorts } from './lib/supabase-internal-ports.mjs'

const args = new Set(process.argv.slice(2))
const jsonOut = args.has('--json')
const skipProbe = args.has('--skip-probe')

/** @param {string} host @param {number} port @param {number} ms */
function probeTcp(host, port, ms = 2500) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    let settled = false
    const done = (open) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(open)
    }
    socket.setTimeout(ms)
    socket.on('connect', () => done(true))
    socket.on('timeout', () => done(false))
    socket.on('error', () => done(false))
  })
}

async function main() {
  const env = loadServidorEnv()
  const ports = getInternalSupabaseTcpPorts()
  const report = {
    schema: 'acomopms-lan-security-check/1',
    lanHost: env.lanHost,
    httpPort: env.httpPort,
    internalPorts: ports,
    probes: [],
    ok: true,
    notes: [],
  }

  if (ports.includes(env.httpPort)) {
    report.ok = false
    report.notes.push(
      `ACOMOPMS_HTTP_PORT (${env.httpPort}) coincide com porta interna Supabase — ajuste servidor.env`,
    )
  }

  const loopback = env.lanHost === '127.0.0.1' || env.lanHost === 'localhost'
  if (loopback) {
    report.notes.push(
      'lanHost é loopback: probes LAN omitidos (ambiente CI ou sem IPv4 LAN).',
    )
  }

  if (!skipProbe && !loopback) {
    for (const port of ports) {
      const open = await probeTcp(env.lanHost, port)
      report.probes.push({ port, host: env.lanHost, reachable: open })
      if (open) {
        report.ok = false
      }
    }
  }

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log('=== Etapa 15 — Verificação segurança LAN ===')
    console.log(`IP LAN: ${env.lanHost} | HTTP público: ${env.httpPort}`)
    console.log(`Portas internas (config): ${ports.join(', ')}`)
    for (const p of report.probes) {
      const mark = p.reachable ? '❌ ABERTA na LAN' : '✅ bloqueada ou indisponível'
      console.log(`  TCP ${p.host}:${p.port} — ${mark}`)
    }
    for (const n of report.notes) console.log(`ℹ️  ${n}`)
    console.log(report.ok ? '\n✅ Segurança LAN OK' : '\n❌ Falha — aplique aplicar-seguranca-lan-firewall (Windows) ou ufw (Linux)')
  }

  process.exit(report.ok ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
