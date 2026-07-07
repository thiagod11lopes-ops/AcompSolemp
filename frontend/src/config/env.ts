export type DataSource = 'local' | 'firebase'

function readDataSource(): DataSource {
  const value = import.meta.env.VITE_DATA_SOURCE
  return value === 'firebase' ? 'firebase' : 'local'
}

export const env = {
  dataSource: readDataSource(),
  isFirebase: readDataSource() === 'firebase',
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
    appStateDocPath:
      import.meta.env.VITE_FIREBASE_APP_STATE_DOC ?? 'appState/current',
  },
} as const

export function isFirebaseConfigured(): boolean {
  return Boolean(
    env.firebase.apiKey &&
      env.firebase.authDomain &&
      env.firebase.projectId &&
      env.firebase.appId,
  )
}
