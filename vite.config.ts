import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set base URL to /EntityGraph/ for GitHub Pages subpath hosting, fallback to relative
  base: process.env.GITHUB_REPOSITORY
    ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
    : '/EntityGraph/',
  build: {
    outDir: 'dist',
  },
});
