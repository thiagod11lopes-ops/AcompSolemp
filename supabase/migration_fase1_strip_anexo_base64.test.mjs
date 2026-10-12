import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const migrationSql = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'migration_fase1_strip_anexo_base64.sql'),
  'utf8',
)

const NOTE = 'fase1-pre-strip-base64'
const OLD_AT = '2020-01-01T00:00:00.000Z'

function asJson(value) {
  if (typeof value === 'string') return JSON.parse(value)
  return value
}

function canonicalPayload() {
  return {
    clinicas: [{ id: 'c1' }],
    arquivos: [
      { id: 'a4', nome: 'so-storage', storagePath: 't/a4' },
    ],
    planilhaAnexosPorPedido: {},
    pedidoPlanilhaEnvio: { 'ped-2': 'texto-livre' },
  }
}

function dirtyPayload() {
  return {
    clinicas: [{ id: 'c1' }],
    arquivos: [
      { id: 'a1', nome: 'com-storage', storagePath: 't/a1', conteudoBase64: 'QQ==', extra: 1 },
      { id: 'a2', nome: 'legado', conteudoBase64: 'LEGADO' },
      { id: 'a3', nome: 'storage-vazio', storagePath: '', conteudoBase64: 'VAZIO' },
      { id: 'a4', nome: 'so-storage', storagePath: 't/a4' },
      { id: 'a5', nome: 'base64-vazio', storagePath: 't/a5', conteudoBase64: '' },
    ],
    planilhaAnexosPorPedido: {
      'ped-1': [
        { id: 'p1', storagePath: 't/p1', conteudoBase64: 'QQ==' },
        { id: 'p2', conteudoBase64: 'LEGADO' },
      ],
    },
    pedidoPlanilhaEnvio: {
      'ped-1': {
        status: 'ok',
        anexos: [
          { id: 'e1', storagePath: 't/e1', conteudoBase64: 'QQ==' },
          { id: 'e2', conteudoBase64: 'LEGADO' },
        ],
      },
      'ped-2': 'texto-livre',
    },
  }
}

function expectedStripped() {
  return {
    clinicas: [{ id: 'c1' }],
    arquivos: [
      { id: 'a1', nome: 'com-storage', storagePath: 't/a1', extra: 1 },
      { id: 'a2', nome: 'legado', conteudoBase64: 'LEGADO' },
      { id: 'a3', nome: 'storage-vazio', storagePath: '', conteudoBase64: 'VAZIO' },
      { id: 'a4', nome: 'so-storage', storagePath: 't/a4' },
      { id: 'a5', nome: 'base64-vazio', storagePath: 't/a5' },
    ],
    planilhaAnexosPorPedido: {
      'ped-1': [
        { id: 'p1', storagePath: 't/p1' },
        { id: 'p2', conteudoBase64: 'LEGADO' },
      ],
    },
    pedidoPlanilhaEnvio: {
      'ped-1': {
        status: 'ok',
        anexos: [
          { id: 'e1', storagePath: 't/e1' },
          { id: 'e2', conteudoBase64: 'LEGADO' },
        ],
      },
      'ped-2': 'texto-livre',
    },
  }
}

async function createDb() {
  const db = new PGlite()
  await db.exec(`
    create table public.app_state (
      tenant_id uuid primary key,
      version text not null,
      payload jsonb not null,
      updated_at timestamptz not null
    );
    create table public.app_state_backup (
      id uuid primary key default gen_random_uuid(),
      tenant_id uuid not null,
      version text not null,
      payload jsonb not null,
      source_updated_at timestamptz,
      backed_up_at timestamptz not null default now(),
      note text
    );
  `)
  return db
}

async function insertState(db, tenantId, payload, updatedAt = OLD_AT) {
  await db.query(
    `insert into public.app_state (tenant_id, version, payload, updated_at)
     values ($1, '1', $2::jsonb, $3::timestamptz)`,
    [tenantId, JSON.stringify(payload), updatedAt],
  )
}

async function insertBackup(db, tenantId, payload, note = NOTE) {
  await db.query(
    `insert into public.app_state_backup (tenant_id, version, payload, source_updated_at, note)
     values ($1, '1', $2::jsonb, $3::timestamptz, $4)`,
    [tenantId, JSON.stringify(payload), OLD_AT, note],
  )
}

async function runMigration(db) {
  await db.exec(migrationSql)
}

async function stateOf(db, tenantId) {
  const { rows } = await db.query(
    `select payload, updated_at from public.app_state where tenant_id = $1`,
    [tenantId],
  )
  return { payload: asJson(rows[0].payload), updatedAt: new Date(rows[0].updated_at).toISOString() }
}

async function fase1Backups(db, tenantId) {
  const { rows } = await db.query(
    `select id, payload, source_updated_at, backed_up_at, note
     from public.app_state_backup
     where tenant_id = $1 and note = $2
     order by backed_up_at, id`,
    [tenantId, NOTE],
  )
  return rows.map((row) => ({
    id: row.id,
    payload: asJson(row.payload),
    sourceUpdatedAt: new Date(row.source_updated_at).toISOString(),
    backedUpAt: new Date(row.backed_up_at).toISOString(),
  }))
}

test('primeira execução remove base64 com storagePath e guarda um backup por tenant', async () => {
  const db = await createDb()
  const dirtyId = '00000000-0000-4000-8000-000000000001'
  const cleanId = '00000000-0000-4000-8000-000000000002'
  const before = dirtyPayload()
  await insertState(db, dirtyId, before)
  await insertState(db, cleanId, canonicalPayload())

  await runMigration(db)

  const dirty = await stateOf(db, dirtyId)
  assert.deepEqual(dirty.payload, expectedStripped())
  assert.notEqual(dirty.updatedAt, OLD_AT)

  const clean = await stateOf(db, cleanId)
  assert.deepEqual(clean.payload, canonicalPayload())
  assert.equal(clean.updatedAt, OLD_AT)

  const dirtyBackups = await fase1Backups(db, dirtyId)
  assert.equal(dirtyBackups.length, 1)
  assert.deepEqual(dirtyBackups[0].payload, before)
  assert.equal(dirtyBackups[0].sourceUpdatedAt, OLD_AT)

  const cleanBackups = await fase1Backups(db, cleanId)
  assert.equal(cleanBackups.length, 1)
  assert.deepEqual(cleanBackups[0].payload, canonicalPayload())

  const { rows } = await db.query(
    `select count(*)::int as n from pg_proc where proname = '_strip_anexo_base64_array'`,
  )
  assert.equal(rows[0].n, 0)
  await db.close()
})

test('segunda execução não cria backup nem altera updated_at quando o payload já está limpo', async () => {
  const db = await createDb()
  const dirtyId = '00000000-0000-4000-8000-000000000011'
  const cleanId = '00000000-0000-4000-8000-000000000012'
  await insertState(db, dirtyId, dirtyPayload())
  await insertState(db, cleanId, canonicalPayload())
  await runMigration(db)

  const dirtyAfterFirst = await stateOf(db, dirtyId)
  const cleanAfterFirst = await stateOf(db, cleanId)
  const dirtyBackups = await fase1Backups(db, dirtyId)
  const cleanBackups = await fase1Backups(db, cleanId)

  await runMigration(db)

  const dirtyAfterSecond = await stateOf(db, dirtyId)
  const cleanAfterSecond = await stateOf(db, cleanId)
  assert.deepEqual(dirtyAfterSecond.payload, dirtyAfterFirst.payload)
  assert.equal(dirtyAfterSecond.updatedAt, dirtyAfterFirst.updatedAt)
  assert.deepEqual(cleanAfterSecond.payload, cleanAfterFirst.payload)
  assert.equal(cleanAfterSecond.updatedAt, cleanAfterFirst.updatedAt)
  assert.deepEqual(await fase1Backups(db, dirtyId), dirtyBackups)
  assert.deepEqual(await fase1Backups(db, cleanId), cleanBackups)
  await db.close()
})

test('falha parcial após o backup não reinsere o snapshot e ainda limpa o payload', async () => {
  const db = await createDb()
  const tenantId = '00000000-0000-4000-8000-000000000021'
  const before = dirtyPayload()
  await insertState(db, tenantId, before)
  await insertBackup(db, tenantId, before)
  await insertBackup(db, tenantId, { clinicas: [{ id: 'copia-anterior' }] })
  const backupsBefore = await fase1Backups(db, tenantId)

  await runMigration(db)

  const state = await stateOf(db, tenantId)
  assert.deepEqual(state.payload, expectedStripped())
  assert.notEqual(state.updatedAt, OLD_AT)
  const backupsAfter = await fase1Backups(db, tenantId)
  assert.equal(backupsAfter.length, backupsBefore.length)
  assert.deepEqual(
    backupsAfter.map((row) => row.payload),
    backupsBefore.map((row) => row.payload),
  )
  await db.close()
})

test('tenant sem backup da fase 1 recebe snapshot; tenant que já tem não recebe outro', async () => {
  const db = await createDb()
  const withBackup = '00000000-0000-4000-8000-000000000031'
  const withoutBackup = '00000000-0000-4000-8000-000000000032'
  await insertState(db, withBackup, dirtyPayload())
  await insertState(db, withoutBackup, dirtyPayload())
  await insertBackup(db, withBackup, { marker: 'backup-antigo' })

  await runMigration(db)

  assert.equal((await fase1Backups(db, withBackup)).length, 1)
  assert.deepEqual((await fase1Backups(db, withBackup))[0].payload, { marker: 'backup-antigo' })
  const created = await fase1Backups(db, withoutBackup)
  assert.equal(created.length, 1)
  assert.deepEqual(created[0].payload, dirtyPayload())
  assert.deepEqual((await stateOf(db, withBackup)).payload, expectedStripped())
  assert.deepEqual((await stateOf(db, withoutBackup)).payload, expectedStripped())
  await db.close()
})
