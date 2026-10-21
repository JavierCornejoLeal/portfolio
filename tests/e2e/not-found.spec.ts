import { expect, test } from '@playwright/test';

test('unknown routes return the custom 404 page', async ({ page }) => {
	const response = await page.goto('/this-page-does-not-exist');

	expect(response?.status()).toBe(404);
	await expect(page).toHaveTitle('Page not found');
	await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible();

	await page.getByRole('link', { name: 'Back home' }).click();
	await expect(page).toHaveURL('/');
	await expect(page.getByRole('heading', { level: 1, name: 'Portfolio' })).toBeVisible();
});
