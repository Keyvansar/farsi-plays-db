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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    // نکته: پلاگین Tailwind v4 گاهی در محیط jsdom با خطای CSS مواجه می‌شود.
    // اگر در هنگام اجرای تست‌ها خطای مربوط به CSS دیدید، کافیست `css: false` را به این بخش اضافه کنید.
  },
});