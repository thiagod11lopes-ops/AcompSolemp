#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadServidorEnv, SERVIDOR_LAN_DIR } from './lib/load-servidor-env.mjs'

const root = resolve(SERVIDOR_LAN_DIR, '../..')
const { httpPort, supabaseInternal } = loadServidorEnv()
const distRoot = resolve(root, 'frontend/dist').replace(/\\/g, '/')
const kongUpstream = supabaseInternal.replace(/\/+$/, '')

const caddyfile = `# Gerado por servidor-lan/generate-caddyfile.mjs — não editar à mão
{
\tauto_https off
}

:${httpPort} {
\tbind 0.0.0.0

\t@supabase path /auth/* /rest/* /storage/* /realtime/* /functions/* /mcp/* /graphql/*
\thandle @supabase {
\t\treverse_proxy ${kongUpstream} {
\t\t\ttransport http {
\t\t\t\tread_timeout 300s
\t\t\t}
\t\t}
\t}

\thandle {
\t\troot * ${distRoot}
\t\ttry_files {path} /index.html
\t\tfile_server
\t}
}
`

const out = resolve(SERVIDOR_LAN_DIR, 'Caddyfile.generated')
writeFileSync(out, caddyfile.replace(/\t/g, '\t'), 'utf8')
console.log(`[servidor-lan] Caddyfile: ${out} (porta ${httpPort}, dist ${distRoot})`)
