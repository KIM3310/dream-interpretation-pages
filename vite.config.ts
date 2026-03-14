import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        about: resolve(rootDir, 'about.html'),
        privacy: resolve(rootDir, 'privacy.html'),
        contact: resolve(rootDir, 'contact.html'),
        symbols: resolve(rootDir, 'symbols.html'),
      },
    },
  },
})
