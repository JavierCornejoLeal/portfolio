import { expect, test } from '@playwright/test';

test.describe('404 page', () => {
	test.beforeEach(async ({ page }) => {
		// About the 404 page, not the loader: come as a returning visitor.
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await page.emulateMedia({ reducedMotion: 'no-preference' });
	});

	test('unknown routes return the custom 404 page', async ({ page }) => {
		const response = await page.goto('/this-page-does-not-exist');
		expect(response?.status()).toBe(404);
		await expect(page).toHaveTitle('Page not found · Javier Cornejo');
		await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible();
	});

	test('sits on one solid black, edge to edge', async ({ page }) => {
		await page.goto('/this-page-does-not-exist');
		const main = page.locator('main');
		await expect(main).toHaveCSS('background-color', 'rgb(0, 0, 0)');
		const viewport = page.viewportSize()!;
		const box = (await main.boundingBox())!;
		expect(box).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
		await expect(page.locator('.page-loader')).toHaveCount(0);
	});

	test('presses a big 404 into the black, like the name in the footer', async ({ page }) => {
		await page.goto('/this-page-does-not-exist');
		const number = page.locator('[data-not-found-number]');
		await expect(number).toHaveText('404');
		await expect(number).toHaveCSS('font-family', /Anton/);
		const viewport = page.viewportSize()!;
		expect((await number.boundingBox())!.width).toBeGreaterThan(viewport.width * 0.4);
		// A dark grey fill, barely off the black, with a lit lower lip and a shaded upper edge.
		const [r, g, b] = (await number.evaluate(el => getComputedStyle(el).color)).match(/\d+/g)!.map(Number);
		expect(Math.max(r, g, b)).toBeGreaterThan(0);
		expect(Math.max(r, g, b)).toBeLessThan(40);
		const shadow = await number.evaluate(el => getComputedStyle(el).textShadow);
		expect(shadow.match(/rgba\(/g)!.length).toBeGreaterThanOrEqual(2);
	});

	test('leads back home through a liquid-glass button and the black curtain', async ({ page }) => {
		await page.goto('/this-page-does-not-exist');
		const back = page.getByRole('link', { name: 'Back home' });
		await expect(back).toHaveAttribute('href', '/');
		await expect(back.locator('[data-refract]')).toHaveCount(1);
		await back.click();
		await expect(page.locator('[data-curtain]')).toBeVisible();
		await expect(page).toHaveURL('/');
		await expect(page.getByRole('heading', { level: 1, name: 'Javier Cornejo' })).toBeVisible();
	});

	test('opens with the black curtain drawing back', async ({ page }) => {
		await page.goto('/this-page-does-not-exist');
		await expect(page.locator('html')).toHaveClass(/curtain-in/);
		await expect(page.locator('[data-curtain-in] span').first()).toHaveCSS('animation-name', 'curtain-reveal');
		await expect(page.locator('[data-curtain-in]')).toBeHidden({ timeout: 3_000 });
	});
});
