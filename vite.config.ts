import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Writes /version.json (build id = build time) so the running app can poll
// it and detect that a newer deploy exists — a PWA left open (especially on
// iOS) can otherwise sit on stale JS indefinitely, never re-fetching
// index.html on its own.
function buildVersionPlugin(): Plugin {
  const buildId = String(Date.now())
  return {
    name: 'build-version',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { name: 'build-id', content: buildId }, injectTo: 'head' }]
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId }),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), buildVersionPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
