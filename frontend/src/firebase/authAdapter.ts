import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { useFirebaseDataSource } from '@/config/dataSource'
import { registerPortalUserMapping } from '@/data/persistence/portalUserPersistence'
import { getFirebaseAuth, getPortalUserCreatorAuth, initFirebase } from '@/firebase/app'
import { isPortalAuthEmail, portalAuthEmail } from '@/firebase/portalAuth'

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

function isEmailAlreadyInUse(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'auth/email-already-in-use'
  )
}

function isInvalidCredential(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    ((error as { code: string }).code === 'auth/invalid-credential' ||
      (error as { code: string }).code === 'auth/wrong-password' ||
      (error as { code: string }).code === 'auth/user-not-found')
  )
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
    if (auth.currentUser) return toSession(auth.currentUser)

    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe()
        resolve(user ? toSession(user) : null)
      })
    })
  },

  getCurrentSession(): FirebaseAuthSession | null {
    if (!useFirebaseDataSource()) return null
    initFirebase()
    const user = getFirebaseAuth().currentUser
    return user ? toSession(user) : null
  },

  async signInWithGoogle(): Promise<FirebaseAuthSession> {
    initFirebase()
    const auth = getFirebaseAuth()
    if (auth.currentUser && auth.currentUser.email && !isPortalAuthEmail(auth.currentUser.email)) {
      return toSession(auth.currentUser)
    }

    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    const credential = await signInWithPopup(auth, provider)
    return toSession(credential.user)
  },

  /** Login da timeline — e-mail/senha internos (sem Google) */
  async signInPortalUser(tenantId: string, login: string, senha: string): Promise<void> {
    if (!useFirebaseDataSource()) return
    initFirebase()
    const auth = getFirebaseAuth()
    const email = portalAuthEmail(tenantId, login)

    if (auth.currentUser?.email === email) return

    if (auth.currentUser) {
      await signOut(auth)
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, email, senha)
      await credential.user.getIdToken(true)
    } catch (error) {
      if (isInvalidCredential(error)) {
        throw new Error('Login ou senha inválidos')
      }
      throw error
    }
  },

  /** Cria conta Firebase para usuário da timeline (gestor permanece logado) */
  async createPortalUser(tenantId: string, login: string, senha: string): Promise<void> {
    if (!useFirebaseDataSource()) return
    initFirebase()
    const email = portalAuthEmail(tenantId, login)
    const creatorAuth = getPortalUserCreatorAuth()

    let portalUid: string
    try {
      const credential = await createUserWithEmailAndPassword(creatorAuth, email, senha)
      portalUid = credential.user.uid
    } catch (error) {
      if (!isEmailAlreadyInUse(error)) throw error
      const credential = await signInWithEmailAndPassword(creatorAuth, email, senha)
      portalUid = credential.user.uid
      await signOut(creatorAuth)
    }

    await registerPortalUserMapping(portalUid, tenantId)
  },

  async signIn(email: string, password: string): Promise<FirebaseAuthSession> {
    initFirebase()
    const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password)
    return toSession(credential.user)
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
