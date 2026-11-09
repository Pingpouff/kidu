import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'badge-96.png', 'sw-notifications.js'],
      workbox: {
        // Handles taps on reminder notifications (focus / reopen the app)
        importScripts: ['sw-notifications.js'],
      },
      manifest: {
        name: 'Ma Routine du Soir',
        short_name: 'Routine Soir',
        description: 'Compagnon visuel de routine du soir pour enfants',
        theme_color: '#1e1b4b',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'landscape',
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
