// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        // 🚀 Rolldown requires manualChunks as a function, not an object
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // React ecosystem
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react';
          }

          // Form libraries
          if (
            id.includes('/react-hook-form/') ||
            id.includes('/@hookform/') ||
            id.includes('/zod/')
          ) {
            return 'vendor-forms';
          }

          // React Query
          if (id.includes('/@tanstack/')) {
            return 'vendor-query';
          }

          // UI utilities
          if (id.includes('/sonner/')) {
            return 'vendor-ui';
          }

          // Supabase
          if (id.includes('/@supabase/')) {
            return 'vendor-supabase';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
});