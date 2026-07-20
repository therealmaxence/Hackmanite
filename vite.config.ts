import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths so GitHub Pages works regardless of subpath
  build: {
    outDir: 'dist',
  },
});
