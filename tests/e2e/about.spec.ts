import { expect, test } from '@playwright/test';

test.describe('about page', () => {
	test('exists at /about as a plain black page for now', async ({ page }) => {
		const response = await page.goto('/about');
		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle(/About/);
		const main = page.locator('main');
		await expect(main).toHaveCSS('background-color', 'rgb(0, 0, 0)');
		const box = (await main.boundingBox())!;
		expect(box.height).toBeGreaterThanOrEqual(page.viewportSize()!.height);
	});

	test('stays out of search results until it has content', async ({ page, request }) => {
		await page.goto('/about');
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
		const sitemap = await (await request.get('/sitemap-0.xml')).text();
		expect(sitemap).not.toContain('/about');
	});

	test('carries the site\'s glass menu, its sections leading back home', async ({ page }) => {
		await page.goto('/about');
		await page.getByRole('button', { name: 'Open menu' }).click();
		const menu = page.getByRole('navigation', { name: 'Main' });
		await expect(menu.getByRole('link', { name: 'Projects', exact: true })).toHaveAttribute('href', '/#projects');
		await expect(menu.getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute('href', '/#contact-inside');
	});
});
