import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeStartUrl, originFromStartUrl } from '../lib/normalize-start-url.mjs'

test('adiciona /login quando só origem', () => {
  assert.equal(normalizeStartUrl('http://192.168.0.1:8080'), 'http://192.168.0.1:8080/login')
})

test('preserva path existente', () => {
  assert.equal(
    normalizeStartUrl('http://192.168.0.1:8080/login'),
    'http://192.168.0.1:8080/login',
  )
})

test('aceita host sem scheme', () => {
  assert.equal(normalizeStartUrl('192.168.0.1:8080'), 'http://192.168.0.1:8080/login')
})

test('originFromStartUrl', () => {
  assert.equal(originFromStartUrl('http://10.0.0.5:8080/login'), 'http://10.0.0.5:8080')
})
