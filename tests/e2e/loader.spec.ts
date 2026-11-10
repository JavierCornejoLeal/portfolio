import { expect, test, type Page } from '@playwright/test';

// Each test runs the WebGL reveal; on GPU-less CI runners that is software rendered, so run them one at a
// time. The 10 s failsafe in Layout never writes `loader-seen`, so expectLifted proves the loader's own logic lifted it.
const LIFT_TIMEOUT = 9000;

async function expectLifted(page: Page, timeout = LIFT_TIMEOUT) {
	await expect(page.locator('.page-loader')).toBeHidden({ timeout });
	expect(await page.evaluate(() => sessionStorage.getItem('loader-seen'))).toBe('1');
}

test.describe('page loader', () => {
	test.describe.configure({ mode: 'serial' });

	test('covers the page on the first visit, then lifts and remembers it', async ({ page }) => {
		await page.goto('/');
		const loader = page.locator('.page-loader');

		await expect(loader).toBeVisible();
		await expect(page.locator('html')).toHaveClass(/is-loading/);
		await expect(loader.locator('[aria-label="Javier Cornejo"] canvas')).toBeAttached();

		await expect(page.getByRole('status')).toHaveText('Loading');

		await expectLifted(page);
		await expect(page.locator('html')).not.toHaveClass(/is-loading/);
		// The reveal unmounts after the fade, so no WebGL keeps running off-screen.
		await expect(loader.locator('canvas')).toHaveCount(0);

		await page.reload();
		await expect(page.locator('html')).not.toHaveClass(/is-loading/);
		await expect(loader).toBeHidden();
	});

	test('holds the headline entrance until the loader lifts', async ({ page }) => {
		await page.goto('/');
		const glyph = page.locator('h1 .curtain-letter').first();

		await expect(glyph).toHaveCSS('animation-play-state', 'paused');
		await expectLifted(page);
		await expect(glyph).toHaveCSS('animation-play-state', 'running');
	});

	test('keeps the covered links out of keyboard reach until the loader lifts', async ({ page }) => {
		await page.goto('/');
		// Located by CSS: while hidden the button is out of the accessibility tree, so a role query finds nothing.
		const firstLink = page.locator('button[aria-controls="dock-menu"]');

		await page.keyboard.press('Tab');
		await expect(firstLink).not.toBeFocused();

		await expectLifted(page);
		await page.locator('body').focus();
		await page.keyboard.press('Tab');
		await expect(firstLink).toBeFocused();
	});

	test('never covers the page when scripts are off', async ({ browser }) => {
		const context = await browser.newContext({ javaScriptEnabled: false });
		const page = await context.newPage();
		await page.goto('/');

		await expect(page.locator('.page-loader')).toBeHidden();
		await expect(page.getByRole('heading', { level: 1, name: 'Javier Cornejo' })).toBeVisible();
		await context.close();
	});

	test('lifts quickly under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');

		await expectLifted(page, 5000);
	});
});
