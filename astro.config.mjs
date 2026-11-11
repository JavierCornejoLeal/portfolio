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
    plugins: [tailwindcss()]
  },

  // The about page stays out of the sitemap (and noindex) until it has content.
  integrations: [react(), sitemap({ filter: (page) => !page.includes('/about') })]
});