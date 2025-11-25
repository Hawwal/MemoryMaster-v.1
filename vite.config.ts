import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: [
      'buffer',
      'process/browser',
    ],
    exclude: ['lucide-react'],
  },
}) 