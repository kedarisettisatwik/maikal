import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_FIREBASE_');
    const keys = ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'STORAGE_BUCKET', 'MESSAGING_SENDER_ID', 'APP_ID'].map(key => `VITE_FIREBASE_${key}`);
    const missing = keys.filter(key => !env[key]);
    if (missing.length) throw new Error(`Missing build environment: ${missing.join(', ')}`);
  }
  return {
  base: mode === 'android' ? '/' : '/maikal/',
  plugins: [react(), VitePWA({
    disable: mode === 'android',
    registerType: 'prompt',
    includeAssets: ['favicon.ico', 'app-icons/*.png'],
    manifest: {
      id: '/maikal/', name: 'Maikal', short_name: 'Maikal',
      description: 'Your goals, plans, money, and daily edition.',
      start_url: '/maikal/', scope: '/maikal/', display: 'standalone',
      theme_color: '#faf8ef', background_color: '#faf8ef',
      prefer_related_applications: false,
      icons: [
        { src: 'app-icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'app-icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'app-icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png}'],
      navigateFallback: '/maikal/index.html',
      navigateFallbackDenylist: [/^\/api\//],
      cleanupOutdatedCaches: true,
    },
  })],
  build: { rollupOptions: { output: { manualChunks: {
    react: ['react', 'react-dom'],
    'firebase-auth': ['firebase/auth'],
    'firebase-firestore': ['firebase/firestore'],
  } } } },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.js', restoreMocks: true },
  };
});
