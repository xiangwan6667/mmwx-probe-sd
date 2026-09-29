import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/postcss'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src/nezhadash/upstream', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { rollupOptions: { input: { main: 'index.html', nezhadash: 'nezhadash/index.html' } } },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
})
