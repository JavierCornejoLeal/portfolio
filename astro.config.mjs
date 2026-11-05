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

  integrations: [react(), sitemap()]
});