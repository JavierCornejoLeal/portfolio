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

		test('prints JAVIER in white halftone dots, cropped by the bottom edge, under the bottom line', async ({ page }) => {
			await page.emulateMedia({ reducedMotion: 'no-preference' });
			await page.goto(path);
			const footer = page.getByRole('contentinfo');
			await footer.scrollIntoViewIfNeeded();
			const name = footer.locator('[data-footer-name]');
			await expect(name).toHaveCount(1);
			const dots = name.locator('canvas[data-halftone]');
			await expect(dots).toHaveAttribute('data-ready', 'true');
			// Last in the footer, its foot on the footer's bottom edge.
			const [box, foot, line] = [await name.boundingBox(), await footer.boundingBox(), await footer.getByText(/^©\d{4}/).boundingBox()];
			expect(Math.abs(box!.y + box!.height - (foot!.y + foot!.height))).toBeLessThan(1);
			expect(line!.y + line!.height).toBeLessThanOrEqual(box!.y + 1);
			// White dots at rest, and the letters run into the bottom edge: cropped, not standing on it.
			const pixels = await dots.evaluate(element => {
				const c = element as HTMLCanvasElement;
				const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
				let white = 0, green = 0;
				for (let i = 0; i < data.length; i += 4 * 7) {
					if (data[i + 3] === 0) continue;
					if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) white++;
					else if (data[i + 1] > 180 && data[i] < 160) green++;
				}
				const last = c.getContext('2d')!.getImageData(0, c.height - 4, c.width, 4).data;
				let edge = 0;
				for (let i = 3; i < last.length; i += 4) if (last[i] > 0) edge++;
				return { white, green, edge };
			});
			expect(pixels.white).toBeGreaterThan(200);
			expect(pixels.green).toBe(0);
			expect(pixels.edge).toBeGreaterThan(20);
			// Only the dots show: the name's own letters, there for its box, are invisible.
			await expect(name).toHaveCSS('color', 'rgba(0, 0, 0, 0)');
			await expect(name).toHaveCSS('text-shadow', 'none');
			// Pushed dots turn green.
			await expect(dots).toHaveAttribute('data-lift', '#5bff2e');
		});

		test('keeps its buttons liquid glass, with no glow painted in the middle', async ({ page }) => {
			await page.goto(path);
			const footer = page.getByRole('contentinfo');
			await footer.scrollIntoViewIfNeeded();
			for (const pill of await footer.locator('[data-footer-pill]').all()) {
				await expect(pill.locator('[data-refract]').first()).toHaveAttribute('data-refract', 'true');
			}
			const glows = await page.evaluate(() =>
				[...document.querySelectorAll('[data-page-footer] *')].filter(element => getComputedStyle(element).backgroundImage.includes('radial-gradient')).length
			);
			expect(glows).toBe(0);
		});

		test('holds the bars still under reduced motion', async ({ page }) => {
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await page.goto(path);
			await expect(page.locator('[data-gradient-bars] [data-bar]').first()).toHaveCSS('animation-name', 'none');
		});
	});
}

test('keeps the green portal footer on home, with no bars and its big name', async ({ page }) => {
	await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
	await page.goto('/');
	await expect(page.locator('[data-gradient-bars]')).toHaveCount(0);
	await page.locator('[data-contact]').evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
	await expect(page.locator('footer#contact-inside [data-footer-name]')).toHaveCount(1, { timeout: 15_000 });
});
