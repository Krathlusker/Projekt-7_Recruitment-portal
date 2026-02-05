import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import criticalMediaPreload from './plugins/vite-plugin-critical-media'

export default defineConfig({
  plugins: [
    // Inject critical media preloads into HTML (runs at build time)
    criticalMediaPreload({
      priorityPatterns: ['HERO'], // Hero poster gets fetchpriority="high"
    }),
    vue(),
    // Auto-import Vue functions + Element Plus on-demand (tree-shaking)
    AutoImport({
      imports: ['vue', 'vue-router'],
      resolvers: [ElementPlusResolver()],
      dts: 'src/auto-imports.d.ts'
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts'
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Inject abstracts (variables + mixins, no CSS output) for use in Vue components
        // _global.scss (with CSS output) is imported once in main.scss
        additionalData: `@use "@/assets/scss/abstracts" as *;`,
        api: 'modern-compiler'
      }
    }
  },
  // Optimize dependencies for faster dev startup
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'element-plus',
      '@element-plus/icons-vue',
      'overlayscrollbars',
      'overlayscrollbars-vue',
      '@videojs-player/vue',
      'video.js'
    ]
    // Note: @kalimahapps/vue-icons is handled by VueIconsPlugin
  },
  // Build configuration for production
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    // Optimize chunking for better caching and parallel loading
    rollupOptions: {
      output: {
        manualChunks: {
          // Core Vue framework
          'vue-vendor': ['vue', 'vue-router'],
          // UI framework - separate chunk for caching
          'element-plus': ['element-plus', '@element-plus/icons-vue'],
          // Video player - lazy loaded, not needed for initial render
          'video-player': ['video.js', '@videojs-player/vue'],
          // Scrollbar - can be deferred
          'scrollbar': ['overlayscrollbars', 'overlayscrollbars-vue']
          // Note: Icons handled by VueIconsPlugin - no manual chunks needed
        }
      }
    }
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
