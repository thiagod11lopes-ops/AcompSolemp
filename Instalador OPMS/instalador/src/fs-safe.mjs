import { lstatSync, existsSync } from 'node:fs'

export function safeLstat(p) {
  try {
    return lstatSync(p)
  } catch {
    return null
  }
}

export function isStatDirectory(st) {
  return st != null && typeof st.isDirectory === 'function' && st.isDirectory()
}

export function isStatFile(st) {
  return st != null && typeof st.isFile === 'function' && st.isFile()
}

export function pathExists(p) {
  return existsSync(p)
}
