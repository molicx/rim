import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// 在 Docker 容器中使用容器名，本地开发使用 localhost
const apiTarget = process.env.VITE_API_TARGET || 'http://go-api:3000'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', // 允许外部访问
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
