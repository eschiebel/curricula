import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  return {
    base: command === 'serve' ? '/' : '/curricula/',
    plugins: [preact()],
    build: {
      chunkSizeWarningLimit: 600, // Suppress warning for chunks < 600 kB
    },
  }
})
