/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

// Dedicated port so tests never hit a running `astro dev` server on 4321
const PORT = 4322;

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: `http://127.0.0.1:${PORT}`,
		trace: 'on-first-retry',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT}`,
		url: `http://127.0.0.1:${PORT}`,
		reuseExistingServer: false,
		timeout: 120_000,
		// Astro backgrounds `astro preview` when it detects an AI agent; keep it in the foreground
		env: { AI_AGENT: '', CLAUDECODE: '' },
	},
});
