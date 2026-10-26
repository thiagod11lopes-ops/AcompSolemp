import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: base path = nome do repositório no GitHub (ainda AcompSolemp).
// A marca do produto é AcompOPMS; só altere repoName se o repositório for renomeado.
const repoName = 'AcompSolemp'
const isGitHubPages = process.env.GITHUB_PAGES === 'true'

export default defineConfig({
  base: isGitHubPages ? `/${repoName}/` : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    // Permite acesso pelo nome amigavel da LAN (ex.: sistema.acompomps.rede)
    allowedHosts: true,
    proxy: {
      // Export CSV local (Local-Export-Api.ps1) — same-origin no Vite e no gateway.
      '/api/export-dados': {
        target: 'http://127.0.0.1:9788',
        changeOrigin: true,
      },
    },
  },
})
