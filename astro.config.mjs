// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

import sitemap from '@astrojs/sitemap';

// Only the dev server uses Vite's default dependency cache. Every other command (build, preview, check: the e2e tests,
// CI, the deploy) bundles React for production, and sharing that cache would hand a running dev server production
// React, whose jsxDEV is undefined, breaking every island ("_jsxDEV is not a function", "useContext of null").
const devServer = process.argv.includes('dev');

// https://astro.build/config
export default defineConfig({
  // Canonical origin for SEO tags and the sitemap (PRO)
  site: 'https://javiercornejo.vercel.app',

  vite: {
    plugins: [tailwindcss()],
    cacheDir: devServer ? 'node_modules/.vite' : 'node_modules/.vite-build',
    // Dev only: pre-bundle every browser dependency at startup. Otherwise Vite discovers some mid-session (after
    // files are added, removed or the branch changes), re-bundles them under a new hash, and the open page's
    // requests for the old one fail with "504 Outdated Optimize Dep", leaving the islands unhydrated.
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'motion/react', 'lucide-react', 'clsx', 'tailwind-merge', 'three']
    }
  },

  // The about and project pages stay out of the sitemap (and noindex) until they have content; so do the Spanish
  // pages (/es/…) until their copy is translated.
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !page.includes('/about') && !page.includes('/projects/') && !new URL(page).pathname.startsWith('/es/')
    })
  ]
});