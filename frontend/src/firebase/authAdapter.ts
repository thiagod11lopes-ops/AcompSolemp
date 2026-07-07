import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { useFirebaseDataSource } from '@/config/dataSource'
import { getFirebaseAuth, initFirebase } from '@/firebase/app'

export interface FirebaseAuthSession {
  uid: string
  email: string | null
}

/** Adapter preparado para substituir credenciais mock na fase 2 */
export const firebaseAuthAdapter = {
  isEnabled(): boolean {
    return useFirebaseDataSource()
  },

  async signIn(email: string, password: string): Promise<FirebaseAuthSession> {
    initFirebase()
    const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password)
    return {
      uid: credential.user.uid,
      email: credential.user.email,
    }
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
      listener(
        user
          ? {
              uid: user.uid,
              email: user.email,
            }
          : null,
      )
    })
  },
}
