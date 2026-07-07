import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { useFirebaseDataSource } from '@/config/dataSource'
import { getFirebaseAuth, initFirebase } from '@/firebase/app'

export interface FirebaseAuthSession {
  uid: string
  email: string | null
}

function toSession(user: FirebaseUser): FirebaseAuthSession {
  return {
    uid: user.uid,
    email: user.email,
  }
}

function isPopupDismissed(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    ((error as { code: string }).code === 'auth/popup-closed-by-user' ||
      (error as { code: string }).code === 'auth/cancelled-popup-request')
  )
}

function isPopupBlocked(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'auth/popup-blocked'
  )
}

async function signInGoogleForTenant(
  auth: ReturnType<typeof getFirebaseAuth>,
  expectedTenantId: string,
): Promise<FirebaseAuthSession> {
  const provider = new GoogleAuthProvider()

  provider.setCustomParameters({ prompt: 'none' })
  try {
    const credential = await signInWithPopup(auth, provider)
    if (credential.user.uid !== expectedTenantId) {
      await signOut(auth)
      throw new Error('Use a mesma conta Google com a qual criou esta organização.')
    }
    return toSession(credential.user)
  } catch {
    // tenta popup interativo
  }

  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    const credential = await signInWithPopup(auth, provider)
    if (credential.user.uid !== expectedTenantId) {
      await signOut(auth)
      throw new Error('Use a mesma conta Google com a qual criou esta organização.')
    }
    return toSession(credential.user)
  } catch (error) {
    if (isPopupDismissed(error)) {
      throw new Error('É necessário entrar com Google para gerenciar cadastros.')
    }
    if (isPopupBlocked(error)) {
      throw new Error(
        'O navegador bloqueou a janela do Google. Permita pop-ups para este site.',
      )
    }
    throw error
  }
}

/** Adapter Firebase Auth — substitui credenciais mock quando VITE_DATA_SOURCE=firebase */
export const firebaseAuthAdapter = {
  isEnabled(): boolean {
    return useFirebaseDataSource()
  },

  async waitForAuthReady(): Promise<FirebaseAuthSession | null> {
    if (!useFirebaseDataSource()) return null
    initFirebase()
    const auth = getFirebaseAuth()
    await auth.authStateReady()
    const user = auth.currentUser
    return user ? toSession(user) : null
  },

  getCurrentSession(): FirebaseAuthSession | null {
    if (!useFirebaseDataSource()) return null
    initFirebase()
    const user = getFirebaseAuth().currentUser
    return user ? toSession(user) : null
  },

  async signInWithGoogle(options?: { selectAccount?: boolean }): Promise<FirebaseAuthSession> {
    initFirebase()
    const auth = getFirebaseAuth()

    if (!options?.selectAccount && auth.currentUser?.email) {
      return toSession(auth.currentUser)
    }

    if (auth.currentUser) {
      await signOut(auth)
    }

    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    const credential = await signInWithPopup(auth, provider)
    return toSession(credential.user)
  },

  async hasGestorFirebaseAuth(expectedTenantId: string): Promise<boolean> {
    if (!useFirebaseDataSource()) return true
    initFirebase()
    const auth = getFirebaseAuth()
    await auth.authStateReady()
    const current = auth.currentUser
    return Boolean(current && current.uid === expectedTenantId)
  },

  async ensureGestorFirebaseAuth(
    expectedTenantId: string,
    options?: { interactive?: boolean },
  ): Promise<void> {
    if (!useFirebaseDataSource()) return
    if (await this.hasGestorFirebaseAuth(expectedTenantId)) return
    if (!options?.interactive) return

    initFirebase()
    const auth = getFirebaseAuth()
    await auth.authStateReady()

    if (auth.currentUser) {
      await signOut(auth)
    }

    await signInGoogleForTenant(auth, expectedTenantId)
  },

  async signOut(): Promise<void> {
    if (!useFirebaseDataSource()) return
    initFirebase()
    await signOut(getFirebaseAuth())
  },

  onAuthStateChanged(listener: (user: FirebaseAuthSession | null) => void): () => void {
    if (!useFirebaseDataSource()) return () => undefined
    initFirebase()
    return onAuthStateChanged(getFirebaseAuth(), (user: FirebaseUser | null) => {
      listener(user ? toSession(user) : null)
    })
  },
}
