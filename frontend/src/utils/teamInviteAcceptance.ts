import { normalizeEmailKey } from '@/utils/email'

const STORAGE_PREFIX = 'acompsolemp:team-invite-accepted:'

function storageKey(email: string): string {
  return `${STORAGE_PREFIX}${normalizeEmailKey(email)}`
}

/** Convite do gestor já aceito neste navegador (primeiro acesso). */
export function isTeamInviteAccepted(email: string): boolean {
  try {
    return localStorage.getItem(storageKey(email)) === '1'
  } catch {
    return false
  }
}

export function markTeamInviteAccepted(email: string): void {
  try {
    localStorage.setItem(storageKey(email), '1')
  } catch {
    // ignore quota / private mode
  }
}

export function clearTeamInviteAccepted(email: string): void {
  try {
    localStorage.removeItem(storageKey(email))
  } catch {
    // ignore
  }
}
