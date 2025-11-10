import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

// Load environment variables from .env.local (fallback to .env)
dotenv.config({ path: '.env.local' });
dotenv.config();

const env = { ...process.env } as Record<string, string>;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': env,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5174',
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
