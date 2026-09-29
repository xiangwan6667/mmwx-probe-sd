import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/postcss'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), vue()],
  resolve: { alias: { '@lumina': fileURLToPath(new URL('./src/lumina/upstream', import.meta.url)), '@emerald': fileURLToPath(new URL('./src/emerald/upstream', import.meta.url)), '@': fileURLToPath(new URL('./src/nezhadash/upstream', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { rollupOptions: { input: { main: 'index.html', nezhadash: 'nezhadash/index.html', emerald: 'emerald/index.html', lumina: 'lumina/index.html' } } },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
})
