import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EmailIcon from '@mui/icons-material/Email'
import { Navigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { useGestorAuth } from '@/contexts/AuthContext'
import { useSupabaseDataSource } from '@/config/dataSource'
import { isSuperAdminEmail, SUPER_ADMIN_EMAIL } from '@/utils/email'
import { loadAppData } from '@/mocks/seed'
import {
  adminDeleteGestorTenant,
  adminDeleteTeamEmail,
  listActiveGestores,
  listGestorTeamEmails,
  type ActiveGestorRow,
  type GestorTeamEmailRow,
} from '@/data/persistence/supabaseAdmin'
import { loginPerfilLabel } from '@/utils/loginPerfis'
import type { UserRole } from '@/types'

export default function GestorEmailsCadastradosPage() {
  const { user } = useGestorAuth()
  const isSupabase = useSupabaseDataSource()
  const sessionEmail =
    user?.email?.trim().toLowerCase() ||
    loadAppData().tenantMeta?.ownerEmail?.trim().toLowerCase() ||
    ''
  const isSuperAdmin = isSupabase && isSuperAdminEmail(sessionEmail)

  const [loading, setLoading] = useState(true)
  const [teamLoading, setTeamLoading] = useState(false)
  const [error, setError] = useState('')
  const [gestores, setGestores] = useState<ActiveGestorRow[]>([])
  const [selected, setSelected] = useState<ActiveGestorRow | null>(null)
  const [team, setTeam] = useState<GestorTeamEmailRow[]>([])
  const [busyEmail, setBusyEmail] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<
    | { kind: 'gestor'; email: string }
    | { kind: 'team'; email: string }
    | null
  >(null)

  const loadGestores = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setGestores(await listActiveGestores())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os gestores')
      setGestores([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTeam = useCallback(async (gestor: ActiveGestorRow) => {
    setTeamLoading(true)
    setError('')
    try {
      const rows = await listGestorTeamEmails(gestor.email)
      setTeam(rows.filter((r) => !r.is_gestor))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os e-mails')
      setTeam([])
    } finally {
      setTeamLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isSuperAdmin) return
    void loadGestores()
  }, [isSuperAdmin, loadGestores])

  if (!isSuperAdmin) {
    return <Navigate to="/gestor/dashboard" replace />
  }

  const handleOpenGestor = async (gestor: ActiveGestorRow) => {
    setSelected(gestor)
    await loadTeam(gestor)
  }

  const handleBack = () => {
    setSelected(null)
    setTeam([])
    void loadGestores()
  }

  const handleConfirmDelete = async () => {
    if (!confirm) return
    setBusyEmail(confirm.email)
    setError('')
    try {
      if (confirm.kind === 'gestor') {
        await adminDeleteGestorTenant(confirm.email)
        setSelected(null)
        setTeam([])
        await loadGestores()
      } else {
        await adminDeleteTeamEmail(confirm.email)
        if (selected) await loadTeam(selected)
        await loadGestores()
      }
      setConfirm(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível excluir')
    } finally {
      setBusyEmail(null)
    }
  }

  const perfilLabel = (perfil: string) => {
    try {
      return loginPerfilLabel(perfil.toUpperCase() as UserRole)
    } catch {
      return perfil
    }
  }

  return (
    <>
      <PageHeader
        title="Emails Cadastrados"
        subtitle={
          selected
            ? `E-mails liberados por ${selected.email}`
            : 'Gestores que criaram banco de dados e e-mails da equipe'
        }
      />

      <Paper sx={{ p: 2, borderRadius: 3 }}>
        {selected && (
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mb: 2, textTransform: 'none', fontWeight: 700 }}
          >
            Voltar aos gestores
          </Button>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {(loading || teamLoading) && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {!loading && !teamLoading && !selected && (
          <>
            {gestores.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <EmailIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">Nenhum gestor cadastrado.</Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>E-mail do gestor</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Organização</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">
                      E-mails na equipe
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right" width={72}>
                      Excluir
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gestores.map((gestor) => (
                    <TableRow
                      key={gestor.tenant_id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => void handleOpenGestor(gestor)}
                    >
                      <TableCell sx={{ fontWeight: 700, wordBreak: 'break-all' }}>
                        {gestor.email}
                      </TableCell>
                      <TableCell>{gestor.org_code}</TableCell>
                      <TableCell align="right">{gestor.team_count}</TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Excluir gestor e organização">
                          <span>
                            <IconButton
                              color="error"
                              size="small"
                              disabled={
                                busyEmail === gestor.email ||
                                gestor.email === SUPER_ADMIN_EMAIL
                              }
                              onClick={() =>
                                setConfirm({ kind: 'gestor', email: gestor.email })
                              }
                              aria-label="Excluir gestor"
                            >
                              {busyEmail === gestor.email ? (
                                <CircularProgress size={18} />
                              ) : (
                                <DeleteOutlineIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}

        {!loading && !teamLoading && selected && (
          <>
            {team.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                Nenhum e-mail de equipe cadastrado por este gestor.
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>E-mail</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Nome</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Setor</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right" width={72}>
                      Excluir
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {team.map((row) => (
                    <TableRow key={row.email} hover>
                      <TableCell sx={{ fontWeight: 700, wordBreak: 'break-all' }}>
                        {row.email}
                      </TableCell>
                      <TableCell>{row.nome || '—'}</TableCell>
                      <TableCell>{perfilLabel(row.perfil)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Excluir e-mail da equipe">
                          <span>
                            <IconButton
                              color="error"
                              size="small"
                              disabled={
                                busyEmail === row.email || row.email === SUPER_ADMIN_EMAIL
                              }
                              onClick={() => setConfirm({ kind: 'team', email: row.email })}
                              aria-label="Excluir e-mail"
                            >
                              {busyEmail === row.email ? (
                                <CircularProgress size={18} />
                              ) : (
                                <DeleteOutlineIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </Paper>

      <Dialog open={Boolean(confirm)} onClose={() => !busyEmail && setConfirm(null)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {confirm?.kind === 'gestor'
              ? `Excluir o gestor ${confirm.email} e todo o banco da organização (equipe, dados e contas Auth)? Esta ação é irreversível.`
              : `Excluir o e-mail ${confirm?.email} da equipe deste gestor?`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirm(null)} disabled={Boolean(busyEmail)}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={Boolean(busyEmail)}
            onClick={() => void handleConfirmDelete()}
          >
            {busyEmail ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
