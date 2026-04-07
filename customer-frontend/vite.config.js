import { defineConfig } from 'vite'

export default defineConfig({
  base: '/customer/',
  build: {
    outDir: '../static/customer',
    emptyOutDir: true
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/sse': 'http://localhost:8000'
    }
  }
})
