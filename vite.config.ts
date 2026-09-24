import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src/app',
  publicDir: '../../public',
  build: { outDir: '../../dist', emptyOutDir: true },
  server: { port: 5180, proxy: { '/api': 'http://localhost:8787' } },
});
