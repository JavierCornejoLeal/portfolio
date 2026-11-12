import { expect, test, type Page } from '@playwright/test';

/*
 * The story under each project's title screen: scrolled into, never on the first screen.
 */

const PROJECTS = [
	['eduardo-calabuig', 'React + Vite'],
	['ocaive', 'Next.js'],
	['hub-cultural-cabanyal', 'WordPress (PHP)'],
	['crm-eduardo', 'Supabase'],
	['portfolio', 'Astro']
] as const;

const story = (page: Page) => page.locator('[data-project-story]');

test.describe('project stories', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
	});

	for (const [slug, firstStack] of PROJECTS) {
		test(`tells ${slug}'s story below its title screen`, async ({ page }) => {
			await page.goto(`/projects/${slug}`);
			const viewport = page.viewportSize()!;
			// The title screen stays as it is: a whole screen, with the story starting below it.
			const title = await page.locator('main > section').first().boundingBox();
			expect(Math.round(title!.height)).toBeGreaterThanOrEqual(viewport.height);
			const top = await story(page).evaluate(element => element.getBoundingClientRect().top);
			expect(top).toBeGreaterThanOrEqual(viewport.height);

			await expect(story(page).getByRole('heading', { level: 2, name: 'Why this stack' })).toBeAttached();
			await expect(story(page).getByRole('heading', { level: 2, name: 'Curiosities' })).toBeAttached();
			await expect(story(page).getByRole('heading', { level: 3, name: firstStack, exact: true })).toBeAttached();

			// Every picture and clip is there and loads once scrolled to.
			await story(page).evaluate(element => element.scrollIntoView());
			for (const image of await story(page).locator('img').all()) {
				await image.scrollIntoViewIfNeeded();
				await expect.poll(() => image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
				await expect(image).toHaveAttribute('alt', /\S/);
			}
			for (const video of await story(page).locator('video').all()) {
				await expect(video).toHaveJSProperty('muted', true);
				await expect(video).toHaveAttribute('playsinline', '');
				await expect(video).toHaveAttribute('poster', /\.webp$/);
				const src = await video.getAttribute('src');
				expect((await page.request.get(src!)).status()).toBe(200);
			}
		});
	}

	test('reveals each block as it scrolls in, and plays a clip only while it is on screen', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/projects/eduardo-calabuig');
		const blocks = story(page).locator('[data-reveal]');
		await expect(blocks.first()).not.toHaveAttribute('data-shown', '');
		const video = story(page).locator('video').first();
		await expect(video).toHaveJSProperty('paused', true);

		await video.scrollIntoViewIfNeeded();
		await expect(story(page).locator('figure[data-reveal]').filter({ has: page.locator('video') }).first()).toHaveAttribute('data-shown', '');
		await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).paused)).toBe(false);

		await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
		await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);
	});

	test('shows everything still under reduced motion, with clips left for the visitor to play', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/projects/eduardo-calabuig');
		const video = story(page).locator('video').first();
		await video.scrollIntoViewIfNeeded();
		await expect(story(page).locator('[data-reveal]').first()).toHaveCSS('opacity', '1');
		await expect(story(page).locator('[data-reveal]').first()).toHaveCSS('transform', 'none');
		await page.waitForTimeout(600);
		await expect(video).toHaveJSProperty('paused', true);
		await expect(video).toHaveAttribute('controls', '');
	});

	test('links a live project to its site, and says so when it is private', async ({ page }) => {
		await page.goto('/projects/eduardo-calabuig');
		await expect(story(page).getByRole('link', { name: /eduardocalabuig\.com/ })).toHaveAttribute('href', 'https://eduardocalabuig.com');
		await page.goto('/projects/crm-eduardo');
		await expect(story(page).getByRole('link')).toHaveCount(0);
		await expect(story(page)).toContainText('Private tool');
	});
});
