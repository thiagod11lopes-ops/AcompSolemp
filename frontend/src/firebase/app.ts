import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { env, isFirebaseConfigured } from '@/config/env'

let firebaseApp: FirebaseApp | null = null
let firestore: Firestore | null = null
let auth: Auth | null = null
let storage: FirebaseStorage | null = null

export function initFirebase(): void {
  if (firebaseApp || !isFirebaseConfigured()) return

  firebaseApp = initializeApp({
    apiKey: env.firebase.apiKey,
    authDomain: env.firebase.authDomain,
    projectId: env.firebase.projectId,
    storageBucket: env.firebase.storageBucket,
    messagingSenderId: env.firebase.messagingSenderId,
    appId: env.firebase.appId,
  })

  firestore = getFirestore(firebaseApp)
  auth = getAuth(firebaseApp)
  storage = getStorage(firebaseApp)
}

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    throw new Error('Firebase não inicializado. Chame initFirebase() no bootstrap.')
  }
  return firebaseApp
}

export function getFirestoreDb(): Firestore {
  if (!firestore) {
    throw new Error('Firestore não disponível. Verifique VITE_DATA_SOURCE e credenciais Firebase.')
  }
  return firestore
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    throw new Error('Firebase Auth não disponível.')
  }
  return auth
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    throw new Error('Firebase Storage não disponível.')
  }
  return storage
}

export function isFirebaseInitialized(): boolean {
  return firebaseApp !== null
}
