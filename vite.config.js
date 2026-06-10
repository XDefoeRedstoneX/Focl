import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2018',
  },
  server: {
    host: true,
    port: 5173,
  },
  test: {
    environment: 'node',
    // Date helpers convert between local time and UTC ISO strings;
    // pin the zone so results don't depend on the machine running tests.
    env: { TZ: 'UTC' },
  },
})
