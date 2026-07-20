import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Automatically extract repo name on GitHub Pages (e.g. /Hackmanite/) or fallback to /Hackmanite/
  base: process.env.GITHUB_REPOSITORY
    ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
    : '/Hackmanite/',
  build: {
    outDir: 'dist',
  },
});
