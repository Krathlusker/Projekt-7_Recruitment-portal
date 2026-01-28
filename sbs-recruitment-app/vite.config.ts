import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Inject only variables and mixins (no CSS output) for use in Vue components
        // _global.scss (with CSS output) is imported once in main.scss
        additionalData: `@use "@/assets/scss/_mixins.scss" as *;`,
        api: 'modern-compiler'
      }
    }
  },
  // Build configuration for production
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild' // Use esbuild (included) instead of terser
  },
  server: {
    port: 5173,
    host: true, // Enable network access in dev mode
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
