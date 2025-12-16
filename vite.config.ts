
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Only include assets that definitely exist. 
      includeAssets: ['icon.svg'], 
      devOptions: {
        enabled: true
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 6000000, 
        navigateFallback: '/index.html',
        // Exclude APIs and IMAGE files from being handled by index.html fallback.
        // This ensures missing images return 404 instead of text/html (fixing the PWA validation error).
        navigateFallbackDenylist: [
            /^\/api/, 
            /^\/__,/,
            /\.(png|jpg|jpeg|svg|ico|webp)$/
        ], 
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60 
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ request }) => ['image', 'font'].includes(request.destination),
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ request }) => ['script', 'style', 'worker'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 
              }
            }
          },
          {
            urlPattern: /^https:\/\/(firebasestorage\.googleapis\.com|lh3\.googleusercontent\.com|cdn\.tailwindcss\.com)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloud-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        id: '/',
        scope: '/',
        name: 'Lumen',
        short_name: 'Lumen',
        description: 'Plataforma de ensino inclusiva e acessível para todos os estudantes.',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: '/?utm_source=pwa',
        display: 'standalone',
        display_override: [
          'window-controls-overlay',
          'standalone',
          'minimal-ui'
        ],
        background_color: '#0f172a',
        theme_color: '#0f172a',
        orientation: 'any',
        categories: [
          'education',
          'productivity'
        ],
        prefer_related_applications: false,
        launch_handler: {
            client_mode: "focus-existing"
        },
        icons: [
          {
            src: 'icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ],
        screenshots: [
          {
            src: 'icon.svg',
            sizes: '1280x720',
            type: 'image/svg+xml',
            form_factor: 'wide',
            label: 'Lumen no Desktop'
          },
          {
            src: 'icon.svg',
            sizes: '360x800',
            type: 'image/svg+xml',
            form_factor: 'narrow',
            label: 'Lumen no Celular'
          }
        ],
        shortcuts: [
          {
            name: "Minhas Turmas",
            short_name: "Turmas",
            description: "Acessar suas turmas diretamente",
            url: "/join_class?utm_source=pwa",
            icons: [{ src: "icon.svg", sizes: "192x192", type: "image/svg+xml" }]
          },
          {
            name: "Ver Atividades",
            short_name: "Atividades",
            description: "Ver atividades pendentes",
            url: "/activities?utm_source=pwa",
            icons: [{ src: "icon.svg", sizes: "192x192", type: "image/svg+xml" }]
          }
        ]
      }
    })
  ],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          ai: ['@google/genai'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
