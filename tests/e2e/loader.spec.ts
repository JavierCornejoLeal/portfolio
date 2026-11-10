import { expect, test } from '@playwright/test';

test.describe('page loader', () => {
	test('covers the page on the first visit, then lifts and remembers it', async ({ page }) => {
		await page.goto('/');
		const loader = page.locator('.page-loader');

		await expect(loader).toBeVisible();
		await expect(page.locator('html')).toHaveClass(/is-loading/);
		await expect(loader.locator('[aria-label="Javier Cornejo"] canvas')).toBeAttached();

		await expect(loader).toBeHidden({ timeout: 8000 });
		await expect(page.locator('html')).not.toHaveClass(/is-loading/);
		expect(await page.evaluate(() => sessionStorage.getItem('loader-seen'))).toBe('1');

		await page.reload();
		await expect(page.locator('html')).not.toHaveClass(/is-loading/);
		await expect(loader).toBeHidden();
	});

	test('holds the headline entrance until the loader lifts', async ({ page }) => {
		await page.goto('/');
		const glyph = page.locator('h1 .curtain-letter').first();

		await expect(glyph).toHaveCSS('animation-play-state', 'paused');
		await expect(page.locator('.page-loader')).toBeHidden({ timeout: 8000 });
		await expect(glyph).toHaveCSS('animation-play-state', 'running');
	});

	test('keeps the covered links out of keyboard reach until the loader lifts', async ({ page }) => {
		await page.goto('/');
		const firstLink = page.getByRole('link', { name: /Instagram/ });

		await page.keyboard.press('Tab');
		await expect(firstLink).not.toBeFocused();

		await expect(page.locator('.page-loader')).toBeHidden({ timeout: 8000 });
		await page.locator('body').focus();
		await page.keyboard.press('Tab');
		await expect(firstLink).toBeFocused();
	});

	test('never covers the page when scripts are off', async ({ browser }) => {
		const context = await browser.newContext({ javaScriptEnabled: false });
		const page = await context.newPage();
		await page.goto('/');

		await expect(page.locator('.page-loader')).toBeHidden();
		await expect(page.getByRole('heading', { level: 1, name: 'Incoming' })).toBeVisible();
		await context.close();
	});

	test('lifts quickly under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');

		await expect(page.locator('.page-loader')).toBeHidden({ timeout: 2500 });
	});
});
