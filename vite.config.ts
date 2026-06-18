/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  // For deploying to GitHub Pages under a repo subpath, set this to '/draw-maid/'.
  // For Netlify / Cloudflare Pages / Vercel (served at the domain root), leave as '/'.
  base: '/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});