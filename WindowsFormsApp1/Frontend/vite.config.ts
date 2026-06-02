import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](react|react-dom)[\\/]/.test(id)) return 'vendor-react';
          if (/[\\/]node_modules[\\/](three|@react-three|postprocessing)[\\/]/.test(id)) return 'vendor-three';
          if (/[\\/]node_modules[\\/](lucide-react|framer-motion)[\\/]/.test(id)) return 'vendor-ui';
          return 'vendor';
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
