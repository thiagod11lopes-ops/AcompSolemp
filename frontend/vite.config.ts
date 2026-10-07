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
})
