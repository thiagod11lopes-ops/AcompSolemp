import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
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
    if (auth.currentUser?.email) {
      return toSession(auth.currentUser)
    }

    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    const credential = await signInWithPopup(auth, provider)
    return toSession(credential.user)
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
