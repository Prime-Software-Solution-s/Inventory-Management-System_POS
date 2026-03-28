import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const rootDir = fileURLToPath(new URL('.', import.meta.url))
  const env = loadEnv(mode, rootDir, '')
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:5001'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        three: fileURLToPath(new URL('./node_modules/three', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            data: ['@tanstack/react-query', 'axios', 'react-hook-form', 'zod', '@hookform/resolvers'],
            motion: ['framer-motion', 'cmdk', 'lucide-react', 'react-hot-toast'],
            charts: ['recharts'],
            'three-core': ['three'],
            'three-fiber': ['@react-three/fiber'],
            'three-drei': ['@react-three/drei'],
          },
        },
      },
    },
  }
})
