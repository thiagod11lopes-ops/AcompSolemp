import test from 'node:test'
import assert from 'node:assert/strict'
import {
  dbUrlForDockerExec,
  parseDbUrlFromSupabaseStatusEnv,
} from '../lib/local-db-url.mjs'
import { buildBackupBasename, formatBackupTimestamp } from '../lib/backup-paths.mjs'

test('parseDbUrlFromSupabaseStatusEnv', () => {
  const url = parseDbUrlFromSupabaseStatusEnv(`
DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
ANON_KEY=abc
`)
  assert.equal(url, 'postgresql://postgres:postgres@127.0.0.1:54322/postgres')
})

test('dbUrlForDockerExec ajusta porta 54322 → 5432', () => {
  assert.equal(
    dbUrlForDockerExec('postgresql://postgres:postgres@127.0.0.1:54322/postgres'),
    'postgresql://postgres:postgres@127.0.0.1:5432/postgres',
  )
})

test('formatBackupTimestamp e basename', () => {
  const d = new Date('2026-03-15T14:05:09')
  assert.equal(formatBackupTimestamp(d), '20260315-140509')
  assert.match(buildBackupBasename(d), /^acomopms-local-20260315-140509$/)
})
