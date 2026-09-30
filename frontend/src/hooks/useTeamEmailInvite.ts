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

export interface UseTeamEmailInviteOptions {
  /** Quando true (padrão), mostra modal se o e-mail ainda não existe no sistema. */
  unregisteredModal?: boolean
}

/**
 * Detecta e-mail liberado pelo gestor no campo de login e controla o modal
 * de aceite (entrar no banco do gestor) ou recusa (virar gestor próprio).
 * Também pode exibir o modal "E-mail não cadastrado".
 */
export function useTeamEmailInvite(
  emailHint: string,
  options: UseTeamEmailInviteOptions = {},
) {
  const unregisteredModalEnabled = options.unregisteredModal !== false
  const isSupabase = useSupabaseDataSource()
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [unregisteredModalOpen, setUnregisteredModalOpen] = useState(false)
  const [recognizedEmail, setRecognizedEmail] = useState('')
  const [gestorEmail, setGestorEmail] = useState<string | null>(null)
  const [recognizedPerfis, setRecognizedPerfis] = useState<UserRole[]>([])
  const [pendingTeamInvite, setPendingTeamInvite] = useState(false)
  const [info, setInfo] = useState('')
  const [signUpOpenSignal, setSignUpOpenSignal] = useState(0)
  const emailLookupSeq = useRef(0)
  const dismissedUnregisteredRef = useRef<Set<string>>(new Set())

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
      setUnregisteredModalOpen(false)
      setRecognizedEmail(email)
      setGestorEmail(access.gestor_email)
      setRecognizedPerfis(resolveTeamPerfis(access))
      setPendingTeamInvite(true)
      setTeamModalOpen(true)
    },
    [],
  )

  const openUnregisteredModal = useCallback((email: string) => {
    setTeamModalOpen(false)
    setPendingTeamInvite(false)
    setRecognizedEmail(email)
    setGestorEmail(null)
    setRecognizedPerfis([])
    setUnregisteredModalOpen(true)
  }, [])

  useEffect(() => {
    if (!isSupabase) return

    const raw = emailHint?.trim() ?? ''
    if (!isMarinhaEmail(raw)) {
      setPendingTeamInvite(false)
      setUnregisteredModalOpen(false)
      return
    }

    const normalized = normalizeEmailKey(raw)
    if (isTeamInviteAccepted(normalized)) {
      setPendingTeamInvite(false)
      setUnregisteredModalOpen(false)
      return
    }

    const seq = ++emailLookupSeq.current
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const status = await authService.getLoginEmailStatus(normalized)
          if (seq !== emailLookupSeq.current) return

          if (status.status === 'team') {
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
            setUnregisteredModalOpen(false)
            setTeamModalOpen(true)
            return
          }

          if (status.status === 'gestor') {
            setPendingTeamInvite(false)
            setUnregisteredModalOpen(false)
            setTeamModalOpen(false)
            return
          }

          // unknown — e-mail ainda não cadastrado no sistema
          setPendingTeamInvite(false)
          setTeamModalOpen(false)
          if (
            !unregisteredModalEnabled ||
            dismissedUnregisteredRef.current.has(normalized)
          ) {
            setUnregisteredModalOpen(false)
            return
          }
          setInfo('')
          openUnregisteredModal(normalized)
        } catch {
          // Silencioso — rede/lookup
        }
      })()
    }, 450)

    return () => window.clearTimeout(timer)
  }, [emailHint, isSupabase, openUnregisteredModal, unregisteredModalEnabled])

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

  /**
   * Garante que e-mail não cadastrado passe pelo modal (Cadastrar) antes de
   * criar conta via Entrar. Gestores e equipe já cadastrados liberam.
   */
  const ensureRegisteredOrSignup = useCallback(
    async (email: string): Promise<boolean> => {
      if (!isSupabase) return true
      if (!isMarinhaEmail(email)) return true
      if (!unregisteredModalEnabled) return true
      const normalized = normalizeEmailKey(email)
      const status = await authService.getLoginEmailStatus(normalized)
      if (status.status === 'gestor') return true
      if (status.status === 'team') {
        return ensureTeamInviteAccepted(normalized)
      }
      dismissedUnregisteredRef.current.delete(normalized)
      openUnregisteredModal(normalized)
      return false
    },
    [
      ensureTeamInviteAccepted,
      isSupabase,
      openUnregisteredModal,
      unregisteredModalEnabled,
    ],
  )

  const handleAcceptTeamInvite = useCallback(() => {
    markTeamInviteAccepted(recognizedEmail)
    setPendingTeamInvite(false)
    setTeamModalOpen(false)
    setUnregisteredModalOpen(false)
    setInfo(
      'Você aceitou fazer parte do sistema do gestor. Defina sua senha para entrar no setor cadastrado.',
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
    const normalized = normalizeEmailKey(recognizedEmail)
    // Evita o modal "não cadastrado" e vai direto ao cadastro de senha (banco próprio).
    if (normalized) dismissedUnregisteredRef.current.add(normalized)
    setUnregisteredModalOpen(false)
    setInfo(
      'Convite recusado. Defina uma senha para criar seu próprio login e banco de dados como Gestor.',
    )
    setSignUpOpenSignal((n) => n + 1)
  }, [recognizedEmail])

  const handleCadastrarUnregistered = useCallback(() => {
    const email = normalizeEmailKey(recognizedEmail)
    if (email) dismissedUnregisteredRef.current.add(email)
    setUnregisteredModalOpen(false)
    setInfo('Defina uma senha para cadastrar este e-mail.')
    setSignUpOpenSignal((n) => n + 1)
  }, [recognizedEmail])

  const handleCancelarUnregistered = useCallback(() => {
    const email = normalizeEmailKey(recognizedEmail)
    if (email) dismissedUnregisteredRef.current.add(email)
    setUnregisteredModalOpen(false)
  }, [recognizedEmail])

  return {
    isSupabase,
    teamModalOpen,
    unregisteredModalOpen,
    recognizedEmail,
    gestorEmail,
    recognizedPerfilLabels,
    pendingTeamInvite,
    info,
    setInfo,
    signUpOpenSignal,
    ensureTeamInviteAccepted,
    ensureRegisteredOrSignup,
    handleAcceptTeamInvite,
    handleDeclineTeamInvite,
    handleCadastrarUnregistered,
    handleCancelarUnregistered,
  }
}
