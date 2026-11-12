import { expect, test } from '@playwright/test';

/*
 * The footer of the pages that are not home (a project, About): the same footer, over black with green bars rising
 * behind it instead of the contact portal's green.
 */

for (const path of ['/projects/ocaive', '/about']) {
	test.describe(`page footer on ${path}`, () => {
		test.beforeEach(async ({ page }) => {
			await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		});

		test('closes the page with the footer over green bars', async ({ page }) => {
			await page.emulateMedia({ reducedMotion: 'no-preference' });
			await page.goto(path);
			const footer = page.getByRole('contentinfo');
			await footer.scrollIntoViewIfNeeded();
			await expect(footer).toContainText("Let's build");
			await expect(footer.getByRole('link', { name: /^Drop me an email/ })).toHaveAttribute('href', /^mailto:/);
			await expect(footer.getByRole('list', { name: 'Elsewhere' }).getByRole('link')).not.toHaveCount(0);
			// Last on the page.
			const bottom = await footer.evaluate(element => Math.round(element.getBoundingClientRect().bottom + scrollY));
			expect(bottom).toBe(await page.evaluate(() => document.documentElement.scrollHeight));

			const bars = page.locator('[data-gradient-bars] [data-bar]');
			expect(await bars.count()).toBeGreaterThanOrEqual(7);
			await expect(bars.first()).toHaveCSS('background-image', /linear-gradient\(to top, rgba\(91, 255, 46/);
			await expect(bars.first()).toHaveCSS('animation-name', 'pulse-bar');
			// Behind the words, never in the way of them.
			await expect(page.locator('[data-gradient-bars]')).toHaveCSS('pointer-events', 'none');
		});

		test('leads Projects back home and Back to top up this page', async ({ page }) => {
			await page.goto(path);
			const nav = page.getByRole('contentinfo').getByRole('navigation', { name: 'Footer' });
			await expect(nav.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/#projects');
			await expect(nav.getByRole('link', { name: 'Back to top' })).toHaveAttribute('href', '#top');
			await expect(page.locator('#top')).toHaveCount(1);
			await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
			await nav.getByRole('link', { name: 'Back to top' }).click();
			await expect.poll(() => page.evaluate(() => scrollY), { timeout: 5000 }).toBeLessThan(5);
		});

		test('holds the bars still under reduced motion', async ({ page }) => {
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await page.goto(path);
			await expect(page.locator('[data-gradient-bars] [data-bar]').first()).toHaveCSS('animation-name', 'none');
		});
	});
}

test('keeps the green portal footer on home, with no bars', async ({ page }) => {
	await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
	await page.goto('/');
	await expect(page.locator('[data-gradient-bars]')).toHaveCount(0);
});
