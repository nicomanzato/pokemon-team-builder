import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Project pages live under /<repo>/ — only in CI, so local dev stays at /
  base: process.env.CI ? '/pokemon-team-builder/' : '/',
  plugins: [react(), tailwindcss()],
  // Dev-only: proxy the fine-tuned model's local mlx server so the browser hits
  // it same-origin (mlx_lm server sends no CORS headers).
  server: {
    proxy: {
      '/mlx': { target: 'http://localhost:8080', changeOrigin: true, rewrite: (p) => p.replace(/^\/mlx/, '') },
      '/ollama': { target: 'http://localhost:11434', changeOrigin: true, rewrite: (p) => p.replace(/^\/ollama/, '') },
    },
  },
})
