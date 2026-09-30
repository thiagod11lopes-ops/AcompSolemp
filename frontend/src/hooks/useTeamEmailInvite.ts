import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { authService } from '@/services/authService'
import { useSupabaseDataSource } from '@/config/dataSource'
import { isMarinhaEmail, normalizeEmailKey } from '@/utils/email'
import { loginPerfilLabel } from '@/utils/loginPerfis'
import {
  clearTeamInviteAccepted,
  isTeamInviteAccepted,
  markTeamInviteAccepted,
} from '@/utils/teamInviteAcceptance'
import type { UserRole } from '@/types'

const PERFIS_EQUIPE = [
  'CLINICA',
  'MEDICAMENTO',
  'AUDITORIA',
  'CONTABILIDADE_IMH',
  'CONFECCAO_SOLEMP',
  'FINANCEIRO',
  'EMPENHADO',
] as const

function resolveTeamPerfis(access: {
  perfil?: string
  perfis?: string[] | null
}): UserRole[] {
  const raw =
    Array.isArray(access.perfis) && access.perfis.length > 0
      ? access.perfis
      : access.perfil
        ? [access.perfil]
        : []
  return [
    ...new Set(
      raw
        .map((p) => p.trim())
        .filter((p): p is UserRole =>
          (PERFIS_EQUIPE as readonly string[]).includes(p),
        ),
    ),
  ]
}

/**
 * Detecta e-mail liberado pelo gestor no campo de login e controla o modal
 * de aceite (entrar no banco do gestor) ou recusa (virar gestor próprio).
 */
export function useTeamEmailInvite(emailHint: string) {
  const isSupabase = useSupabaseDataSource()
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [recognizedEmail, setRecognizedEmail] = useState('')
  const [gestorEmail, setGestorEmail] = useState<string | null>(null)
  const [recognizedPerfis, setRecognizedPerfis] = useState<UserRole[]>([])
  const [pendingTeamInvite, setPendingTeamInvite] = useState(false)
  const [info, setInfo] = useState('')
  const [signUpOpenSignal, setSignUpOpenSignal] = useState(0)
  const emailLookupSeq = useRef(0)

  const recognizedPerfilLabels = useMemo(
    () =>
      recognizedPerfis
        .filter((p) => (PERFIS_EQUIPE as readonly string[]).includes(p))
        .map((p) => loginPerfilLabel(p)),
    [recognizedPerfis],
  )

  const openTeamInviteModal = useCallback(
    (
      email: string,
      access: { gestor_email: string | null; perfil: string; perfis?: string[] | null },
    ) => {
      setRecognizedEmail(email)
      setGestorEmail(access.gestor_email)
      setRecognizedPerfis(resolveTeamPerfis(access))
      setPendingTeamInvite(true)
      setTeamModalOpen(true)
    },
    [],
  )

  useEffect(() => {
    if (!isSupabase) return

    const raw = emailHint?.trim() ?? ''
    if (!isMarinhaEmail(raw)) {
      setPendingTeamInvite(false)
      return
    }

    const normalized = normalizeEmailKey(raw)
    if (isTeamInviteAccepted(normalized)) {
      setPendingTeamInvite(false)
      return
    }

    const seq = ++emailLookupSeq.current
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const access = await authService.getTeamEmailAccess(normalized)
          if (seq !== emailLookupSeq.current) return
          if (!access) {
            setPendingTeamInvite(false)
            return
          }
          setRecognizedEmail(normalized)
          setGestorEmail(access.gestor_email)
          setRecognizedPerfis(resolveTeamPerfis(access))
          setPendingTeamInvite(true)
          setInfo('')
          setTeamModalOpen(true)
        } catch {
          // Silencioso — rede/lookup
        }
      })()
    }, 450)

    return () => window.clearTimeout(timer)
  }, [emailHint, isSupabase])

  const ensureTeamInviteAccepted = useCallback(
    async (email: string): Promise<boolean> => {
      if (!isSupabase) return true
      if (!isMarinhaEmail(email)) return true
      const normalized = normalizeEmailKey(email)
      if (isTeamInviteAccepted(normalized)) {
        setPendingTeamInvite(false)
        return true
      }
      const access = await authService.getTeamEmailAccess(normalized)
      if (!access) return true
      openTeamInviteModal(normalized, access)
      return false
    },
    [isSupabase, openTeamInviteModal],
  )

  const handleAcceptTeamInvite = useCallback(() => {
    markTeamInviteAccepted(recognizedEmail)
    setPendingTeamInvite(false)
    setTeamModalOpen(false)
    setInfo(
      'Cadastro aceito. Defina sua senha para entrar na organização do gestor.',
    )
    setSignUpOpenSignal((n) => n + 1)
  }, [recognizedEmail])

  const handleDeclineTeamInvite = useCallback(async () => {
    await authService.declineTeamInvite(recognizedEmail)
    clearTeamInviteAccepted(recognizedEmail)
    setTeamModalOpen(false)
    setGestorEmail(null)
    setRecognizedPerfis([])
    setPendingTeamInvite(false)
    setInfo(
      'Você saiu do cadastro desse gestor. Agora pode criar sua própria conta como Gestor com banco próprio.',
    )
  }, [recognizedEmail])

  return {
    isSupabase,
    teamModalOpen,
    recognizedEmail,
    gestorEmail,
    recognizedPerfilLabels,
    pendingTeamInvite,
    info,
    setInfo,
    signUpOpenSignal,
    ensureTeamInviteAccepted,
    handleAcceptTeamInvite,
    handleDeclineTeamInvite,
  }
}
