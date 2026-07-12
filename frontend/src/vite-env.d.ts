/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GESTOR_GOOGLE_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
