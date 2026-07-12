import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Project pages live under /<repo>/ — only in CI, so local dev stays at /
  base: process.env.CI ? '/pokemon-team-builder/' : '/',
  plugins: [react(), tailwindcss()],
})
