import { expect, test } from '@playwright/test';

test.describe('home page', () => {
	test('renders the hero heading and tagline', async ({ page }) => {
		const response = await page.goto('/');

		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle('Portfolio');
		await expect(page.getByRole('heading', { level: 1, name: 'Portfolio' })).toBeVisible();
		await expect(page.getByText('Built with Astro and Tailwind CSS.')).toBeVisible();
	});

	test('mounts the Silk background canvas behind the hero', async ({ page }) => {
		await page.goto('/');

		const canvas = page.locator('main canvas');
		await expect(canvas).toBeAttached();
		const box = await canvas.boundingBox();
		const viewport = page.viewportSize();
		expect(box?.width).toBe(viewport?.width);
		expect(box?.height).toBe(viewport?.height);
	});

	test('keeps the hero text from blocking pointer events on the background', async ({ page }) => {
		await page.goto('/');

		const section = page.locator('main section');
		await expect(section).toHaveCSS('pointer-events', 'none');
	});

	test('loads without runtime errors', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', error => errors.push(error.message));

		await page.goto('/');
		await expect(page.locator('main canvas')).toBeAttached();

		expect(errors).toEqual([]);
	});
});
