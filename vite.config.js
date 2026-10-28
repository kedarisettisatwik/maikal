import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_FIREBASE_');
    const keys = ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'STORAGE_BUCKET', 'MESSAGING_SENDER_ID', 'APP_ID'].map(key => `VITE_FIREBASE_${key}`);
    const missing = keys.filter(key => !env[key]);
    if (missing.length) throw new Error(`Missing build environment: ${missing.join(', ')}`);
  }
  return {
  base: '/maikal/',
  plugins: [react()],
  build: { rollupOptions: { output: { manualChunks: {
    react: ['react', 'react-dom'],
    'firebase-auth': ['firebase/auth'],
    'firebase-firestore': ['firebase/firestore'],
  } } } },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.js', restoreMocks: true },
  };
});
