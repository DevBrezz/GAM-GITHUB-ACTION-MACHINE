/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
  readonly SSR: boolean
  readonly VITE_BASE_PATH?: string
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
