import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// https://vitejs.dev/config/
export default defineConfig({
  // App version shown in Settings and used by the "What's new" window (src/domain/changelog.ts)
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      // A new version waits until a parent taps "Update" (src/services/appUpdate.ts),
      // so the page never reloads in the middle of a child's routine.
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'badge-96.png', 'sw-notifications.js'],
      workbox: {
        // Handles taps on reminder notifications (focus / reopen the app)
        importScripts: ['sw-notifications.js'],
      },
      manifest: {
        name: 'Kidu – Ma routine',
        short_name: 'Kidu',
        lang: 'fr',
        description: 'Compagnon visuel des routines de la journée pour enfants : matin, après l\'école, repas et coucher',
        theme_color: '#1e1b4b',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ]
      }
    })
  ],
  server: {
    port: 5173,
    host: true
  }
})
