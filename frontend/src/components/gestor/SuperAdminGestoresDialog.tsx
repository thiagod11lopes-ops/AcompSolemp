import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material'
import PauseCircleIcon from '@mui/icons-material/PauseCircle'
import PlayCircleIcon from '@mui/icons-material/PlayCircle'
import LoginIcon from '@mui/icons-material/Login'
import GroupsIcon from '@mui/icons-material/Groups'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import {
  adminDeleteGestorTenant,
  adminDeleteTeamEmail,
  listActiveGestores,
  listGestorTeamEmails,
  setAccountPaused,
  type ActiveGestorRow,
  type GestorTeamEmailRow,
} from '@/data/persistence/supabaseAdmin'
import { SUPER_ADMIN_EMAIL } from '@/utils/email'
import { useAuth } from '@/contexts/AuthContext'
import { useIsSuperAdminSession } from '@/hooks/useIsSuperAdminSession'

interface SuperAdminGestoresDialogProps {
  open: boolean
  onClose: () => void
}

type ConfirmDelete =
  | { kind: 'gestor'; email: string }
  | { kind: 'team'; email: string }

export function SuperAdminGestoresDialog({ open, onClose }: SuperAdminGestoresDialogProps) {
  const navigate = useNavigate()
  const { startImpersonation } = useAuth()
  const isSuperAdmin = useIsSuperAdminSession()
  const [loading, setLoading] = useState(false)
  const [teamLoading, setTeamLoading] = useState(false)
  const [enteringEmail, setEnteringEmail] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [teamError, setTeamError] = useState('')
  const [gestores, setGestores] = useState<ActiveGestorRow[]>([])
  const [selectedGestor, setSelectedGestor] = useState<ActiveGestorRow | null>(null)
  const [team, setTeam] = useState<GestorTeamEmailRow[]>([])
  const [busyEmail, setBusyEmail] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmDelete | null>(null)

  const loadGestores = useCallback(async () => {
    if (!isSuperAdmin) {
      setGestores([])
      return
    }
    setLoading(true)
    setError('')
    try {
      setGestores(await listActiveGestores())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os gestores')
    } finally {
      setLoading(false)
    }
  }, [isSuperAdmin])

  const loadTeam = useCallback(async (gestor: ActiveGestorRow) => {
    setTeamLoading(true)
    setTeamError('')
    try {
      const fromRpc = await listGestorTeamEmails(gestor.email)
      if (fromRpc.length === 0) {
        setTeam([
          {
            email: gestor.email,
            perfil: 'GESTOR',
            nome: 'Gestor',
            paused: gestor.paused,
            is_gestor: true,
          },
        ])
      } else {
        setTeam(
          fromRpc.map((r) =>
            r.email === gestor.email ? { ...r, paused: gestor.paused, is_gestor: true } : r,
          ),
        )
      }
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : 'Não foi possível carregar a equipe')
      setTeam([])
    } finally {
      setTeamLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setSelectedGestor(null)
      setTeam([])
      setError('')
      setTeamError('')
      setEnteringEmail(null)
      setConfirm(null)
      return
    }
    if (!isSuperAdmin) {
      onClose()
      return
    }
    void loadGestores()
  }, [open, loadGestores, isSuperAdmin, onClose])

  const handleOpenTeam = async (gestor: ActiveGestorRow) => {
    setSelectedGestor(gestor)
    await loadTeam(gestor)
  }

  const handleCloseTeam = () => {
    setSelectedGestor(null)
    setTeam([])
    setTeamError('')
    void loadGestores()
  }

  const handleEnterAs = async (email: string) => {
    setEnteringEmail(email)
    setError('')
    setTeamError('')
    try {
      const result = await startImpersonation(email)
      setSelectedGestor(null)
      onClose()
      navigate(result.route, { replace: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível entrar como este e-mail'
      if (selectedGestor) setTeamError(msg)
      else setError(msg)
    } finally {
      setEnteringEmail(null)
    }
  }

  const handleTogglePause = async (email: string, paused: boolean) => {
    if (email === SUPER_ADMIN_EMAIL) return
    setBusyEmail(email)
    setError('')
    setTeamError('')
    try {
      const next = await setAccountPaused(email, paused)
      setTeam((rows) => rows.map((row) => (row.email === email ? { ...row, paused: next } : row)))
      setGestores((rows) =>
        rows.map((row) => (row.email === email ? { ...row, paused: next } : row)),
      )
      if (selectedGestor?.email === email) {
        setSelectedGestor({ ...selectedGestor, paused: next })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível alterar a pausa'
      if (selectedGestor) setTeamError(msg)
      else setError(msg)
    } finally {
      setBusyEmail(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!confirm) return
    if (confirm.email === SUPER_ADMIN_EMAIL) {
      setConfirm(null)
      return
    }
    setBusyEmail(confirm.email)
    setError('')
    setTeamError('')
    try {
      if (confirm.kind === 'gestor') {
        await adminDeleteGestorTenant(confirm.email)
        setSelectedGestor(null)
        setTeam([])
        await loadGestores()
      } else {
        await adminDeleteTeamEmail(confirm.email)
        if (selectedGestor) await loadTeam(selectedGestor)
        await loadGestores()
      }
      setConfirm(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível excluir'
      if (selectedGestor && confirm.kind === 'team') setTeamError(msg)
      else setError(msg)
    } finally {
      setBusyEmail(null)
    }
  }

  const teamMembers = team.filter((r) => !r.is_gestor)
  const gestorRow = team.find((r) => r.is_gestor)
  const deleting = Boolean(busyEmail && confirm)

  return (
    <>
      <Dialog open={open && isSuperAdmin} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Gestores ativos</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Lista o que pode fazer login no sistema. Excluir um gestor remove também todos os
            e-mails da equipe. E-mail excluído só volta a entrar após novo cadastro.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <List disablePadding>
              {gestores.length === 0 ? (
                <Typography color="text.secondary">Nenhum gestor ativo no sistema.</Typography>
              ) : (
                gestores.map((gestor) => {
                  const entering = enteringEmail === gestor.email
                  const busy = busyEmail === gestor.email
                  return (
                    <Box key={gestor.tenant_id}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          py: 0.5,
                          px: 0.5,
                        }}
                      >
                        <ListItemButton
                          onClick={() => void handleOpenTeam(gestor)}
                          sx={{ flex: 1, minWidth: 0, borderRadius: 1 }}
                        >
                          <Box sx={{ width: '100%' }}>
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Typography sx={{ fontWeight: 700, wordBreak: 'break-all' }}>
                                {gestor.email}
                              </Typography>
                              {gestor.paused && (
                                <Chip size="small" label="Pausado" color="warning" />
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              Org {gestor.org_code} · {gestor.team_count} e-mail(s) na equipe
                            </Typography>
                            <Typography
                              variant="caption"
                              color="primary"
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.5,
                                mt: 0.5,
                              }}
                            >
                              <GroupsIcon sx={{ fontSize: 14 }} />
                              Ver equipe
                            </Typography>
                          </Box>
                        </ListItemButton>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                          {gestor.paused ? (
                            <PauseCircleIcon fontSize="small" color="warning" />
                          ) : (
                            <PlayCircleIcon fontSize="small" color="success" />
                          )}
                          <Switch
                            checked={!gestor.paused}
                            disabled={busy}
                            onChange={(_, checked) =>
                              void handleTogglePause(gestor.email, !checked)
                            }
                            slotProps={{
                              input: {
                                'aria-label': gestor.paused ? 'Reativar conta' : 'Pausar conta',
                              },
                            }}
                          />
                          <Tooltip
                            title={gestor.paused ? 'Conta pausada' : 'Entrar como este gestor'}
                          >
                            <span>
                              <IconButton
                                color="primary"
                                size="small"
                                disabled={Boolean(enteringEmail) || gestor.paused || busy}
                                onClick={() => void handleEnterAs(gestor.email)}
                                aria-label="Entrar como este gestor"
                              >
                                {entering ? (
                                  <CircularProgress size={18} />
                                ) : (
                                  <LoginIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Excluir gestor e toda a equipe">
                            <span>
                              <IconButton
                                color="error"
                                size="small"
                                disabled={busy || Boolean(enteringEmail)}
                                onClick={() =>
                                  setConfirm({ kind: 'gestor', email: gestor.email })
                                }
                                aria-label="Excluir gestor"
                              >
                                {busy && confirm?.kind === 'gestor' ? (
                                  <CircularProgress size={18} />
                                ) : (
                                  <DeleteOutlinedIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </Box>
                      <Divider />
                    </Box>
                  )
                })
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(selectedGestor)} onClose={handleCloseTeam} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>
          Equipe de {selectedGestor?.email ?? ''}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            E-mails que podem fazer login nesta organização. Excluir um e-mail bloqueia o acesso até
            novo cadastro.
          </Typography>

          {teamError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {teamError}
            </Alert>
          )}

          {teamLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <List disablePadding>
              {gestorRow && selectedGestor && (
                <>
                  <TeamEmailRow
                    row={gestorRow}
                    enteringEmail={enteringEmail}
                    busyEmail={busyEmail}
                    onEnter={handleEnterAs}
                    onTogglePause={handleTogglePause}
                    onDelete={() =>
                      setConfirm({ kind: 'gestor', email: selectedGestor.email })
                    }
                    enterLabel="Entrar como gestor"
                    deleteLabel="Excluir gestor e equipe"
                  />
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, px: 0.5 }}>
                    E-mails cadastrados ({teamMembers.length})
                  </Typography>
                </>
              )}

              {teamMembers.length === 0 ? (
                <Typography color="text.secondary" sx={{ px: 0.5 }}>
                  Nenhum e-mail de equipe cadastrado por este gestor.
                </Typography>
              ) : (
                teamMembers.map((row) => (
                  <TeamEmailRow
                    key={row.email}
                    row={row}
                    enteringEmail={enteringEmail}
                    busyEmail={busyEmail}
                    onEnter={handleEnterAs}
                    onTogglePause={handleTogglePause}
                    onDelete={() => setConfirm({ kind: 'team', email: row.email })}
                    enterLabel="Entrar"
                    deleteLabel="Excluir e-mail"
                  />
                ))
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseTeam}>Voltar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirm)} onClose={() => !deleting && setConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>
          {confirm?.kind === 'gestor' ? 'Excluir gestor?' : 'Excluir e-mail?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {confirm?.kind === 'gestor' ? (
              <>
                Isso remove <strong>{confirm.email}</strong>, o banco da organização e{' '}
                <strong>todos os e-mails cadastrados</strong> por ele. Ninguém dessa lista poderá
                fazer login até se cadastrar novamente.
              </>
            ) : (
              <>
                Isso remove <strong>{confirm?.email}</strong> da equipe. Esse e-mail não poderá
                fazer login até ser cadastrado de novo por um gestor ou criar conta própria.
              </>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setConfirm(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleting}
            onClick={() => void handleConfirmDelete()}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

function TeamEmailRow({
  row,
  enteringEmail,
  busyEmail,
  onEnter,
  onTogglePause,
  onDelete,
  enterLabel,
  deleteLabel,
}: {
  row: GestorTeamEmailRow
  enteringEmail: string | null
  busyEmail: string | null
  onEnter: (email: string) => void
  onTogglePause: (email: string, paused: boolean) => void
  onDelete: () => void
  enterLabel: string
  deleteLabel: string
}) {
  const isSelf = row.email === SUPER_ADMIN_EMAIL
  const entering = enteringEmail === row.email
  const busy = busyEmail === row.email

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 1.25,
          px: 0.5,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography sx={{ fontWeight: 700, wordBreak: 'break-all' }}>{row.email}</Typography>
            {row.is_gestor && <Chip size="small" label="Gestor" color="primary" />}
            {row.paused && <Chip size="small" label="Pausado" color="warning" />}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {row.perfil}
            {row.nome ? ` · ${row.nome}` : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {row.paused ? (
            <PauseCircleIcon fontSize="small" color="warning" />
          ) : (
            <PlayCircleIcon fontSize="small" color="success" />
          )}
          <Switch
            checked={!row.paused}
            disabled={isSelf || busy}
            onChange={(_, checked) => void onTogglePause(row.email, !checked)}
            slotProps={{
              input: {
                'aria-label': row.paused ? 'Reativar conta' : 'Pausar conta',
              },
            }}
          />
          <Button
            size="small"
            variant="contained"
            startIcon={
              entering ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <LoginIcon fontSize="small" />
              )
            }
            disabled={Boolean(enteringEmail) || row.paused || isSelf || busy}
            onClick={() => void onEnter(row.email)}
            sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
          >
            {entering ? 'Entrando...' : enterLabel}
          </Button>
          {!isSelf && (
            <Tooltip title={deleteLabel}>
              <span>
                <IconButton
                  color="error"
                  size="small"
                  disabled={busy || Boolean(enteringEmail)}
                  onClick={onDelete}
                  aria-label={deleteLabel}
                >
                  {busy ? <CircularProgress size={18} /> : <DeleteOutlinedIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>
      <Divider />
    </Box>
  )
}
