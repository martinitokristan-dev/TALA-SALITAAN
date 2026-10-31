import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// In development, /api is forwarded to the Laravel server (php artisan serve on port 8000),
// so the browser talks to one origin and no CORS setup is needed.
export default defineConfig({
  plugins: [
    react(),
    /*
     * Service worker: the whole app (screens, fonts, the 3D map code, both 3D characters and
     * the Draco decoder) is stored on the device after the first visit, so going back or
     * reopening never downloads it again. File names carry a content hash, so a new release
     * replaces only the files that changed (autoUpdate). Uploaded pictures and sounds are
     * kept cache-first. API data is NOT cached here: lib/cache.ts handles it (stale-while-revalidate).
     */
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Tala-Salitaan',
        short_name: 'Tala-Salitaan',
        lang: 'fil',
        display: 'standalone',
        orientation: 'any',
        background_color: '#8fd3f7',
        theme_color: '#4f46e5',
        start_url: '/',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff,woff2,glb,wasm}', 'draco/*.js'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Teacher-uploaded pictures and sounds (Laravel media route, or Cloudinary after deploy).
            urlPattern: ({ url }) => url.pathname.startsWith('/api/media/') || url.hostname === 'res.cloudinary.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'tala-media',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true, // lets tablets on the same Wi-Fi open the game
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
