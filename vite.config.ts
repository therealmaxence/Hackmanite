import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative base path for universal compatibility on GitHub Pages
  base: './',
  build: {
    outDir: 'dist',
  },
});
