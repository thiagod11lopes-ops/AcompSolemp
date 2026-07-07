import { useFirebaseDataSource } from '@/config/dataSource'
import { firebaseAuthAdapter } from '@/firebase/authAdapter'
import { loadAppData } from '@/mocks/seed'
import { getTenantId } from '@/services/tenantService'

/** Provisiona contas Firebase (e-mail/senha internos) para usuários da timeline */
export async function syncPortalFirebaseUsers(): Promise<void> {
  if (!useFirebaseDataSource()) return

  const tenantId = getTenantId()
  if (!tenantId) return

  const data = loadAppData()
  const credenciais = data.credenciais ?? {}

  await Promise.all(
    Object.entries(credenciais).map(([login, cred]) =>
      firebaseAuthAdapter.createPortalUser(tenantId, login, cred.senha),
    ),
  )
}
