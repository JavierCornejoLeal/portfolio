// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Canonical origin for SEO tags and the sitemap (PRO)
  site: 'https://javiercornejo.vercel.app',

  vite: {
    plugins: [tailwindcss()],
    // Dev only: pre-bundle every browser dependency at startup. Otherwise Vite discovers some mid-session (after
    // files are added, removed or the branch changes), re-bundles them under a new hash, and the open page's
    // requests for the old one fail with "504 Outdated Optimize Dep", leaving the islands unhydrated.
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'motion/react', 'lucide-react', 'clsx', 'tailwind-merge', 'three']
    }
  },

  // The about and project pages stay out of the sitemap (and noindex) until they have content.
  integrations: [react(), sitemap({ filter: (page) => !page.includes('/about') && !page.includes('/projects/') })]
});