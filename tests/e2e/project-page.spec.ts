import { expect, test, type Page } from '@playwright/test';

/** Opens the menu once its island has hydrated (Astro drops `ssr`): a click before that is lost on a slow runner. */
async function openMenu(page: Page) {
	const button = page.getByRole('button', { name: 'Open menu' });
	await expect(page.locator('astro-island[ssr]', { has: button })).toHaveCount(0, { timeout: 15_000 });
	await button.click();
}

const PROJECTS = [
	['eduardo-calabuig', 'Eduardo Calabuig'],
	['ocaive', 'ÒCAIVE'],
	['hub-cultural-cabanyal', 'Hub Cultural Cabanyal']
] as const;

test.describe('project pages', () => {
	for (const [slug, name] of PROJECTS) {
		test(`opens ${name} on a black page with its name set big at the foot of the first screen`, async ({ page }) => {
			const response = await page.goto(`/projects/${slug}`);
			expect(response?.status()).toBe(200);
			await expect(page).toHaveTitle(new RegExp(name));
			await expect(page.locator('main')).toHaveCSS('background-color', 'rgb(0, 0, 0)');

			const title = page.getByRole('heading', { level: 1, name });
			await expect(title).toBeVisible();
			await expect(title).toHaveCSS('font-family', /Anton/);
			await expect(title).toHaveCSS('text-transform', 'uppercase');
			const viewport = page.viewportSize()!;
			const box = (await title.boundingBox())!;
			// Big, low on the first screen, from the left inset.
			expect(parseFloat(await title.evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(80);
			expect(box.y + box.height).toBeGreaterThan(viewport.height * 0.7);
			expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
			expect(box.x).toBeLessThan(viewport.width * 0.25);
			// A hairline under it.
			await expect(page.locator('[data-project-rule]')).toBeVisible();
		});
	}

	test('raises the title letter by letter out of a mask, one after another', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/projects/ocaive');
		const title = page.getByRole('heading', { level: 1, name: 'ÒCAIVE' });
		// Each letter rides in its own clipped window, so it rises from below the line.
		const letters = title.locator('[data-letter]');
		await expect(letters).toHaveCount('ÒCAIVE'.length);
		await expect(title.locator('[data-letter-mask]').first()).toHaveCSS('overflow', 'hidden');
		await expect(letters.first()).toHaveCSS('animation-name', 'letter-rise');
		// Staggered: each letter starts after the one before it.
		const delays = await letters.evaluateAll(elements => elements.map(element => parseFloat(getComputedStyle(element).animationDelay)));
		for (let i = 1; i < delays.length; i++) expect(delays[i]).toBeGreaterThan(delays[i - 1]);
		// The words still read as one name for assistive technology.
		await expect(title).toHaveAccessibleName('ÒCAIVE');
	});

	test('keeps accents whole: a letter\'s mask leaves room above the capitals without moving the title', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/projects/ocaive');
		const mask = page.getByRole('heading', { level: 1 }).locator('[data-letter-mask]').first();
		const room = await mask.evaluate(element => {
			const style = getComputedStyle(element);
			const size = parseFloat(style.fontSize);
			return { top: parseFloat(style.paddingTop) / size, margin: parseFloat(style.marginTop) / size };
		});
		// Room above the capitals for the Ò's grave accent...
		expect(room.top).toBeGreaterThanOrEqual(0.2);
		// ...given back by a negative margin, so the line sits where it did.
		expect(room.margin).toBeCloseTo(-room.top, 3);
	});

	test('sets the title still under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/projects/ocaive');
		const letters = page.getByRole('heading', { level: 1 }).locator('[data-letter]');
		await expect(letters.first()).toHaveCSS('animation-name', 'none');
	});

	test('carries the site\'s glass menu instead of a header bar', async ({ page }) => {
		await page.goto('/projects/eduardo-calabuig');
		// No header bar: no logo link, no inline nav.
		await expect(page.locator('header')).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'Javier Cornejo, home' })).toHaveCount(0);
		await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);

		// The same = button, top right, opening the same panel; its section links lead back home.
		const button = page.getByRole('button', { name: 'Open menu' });
		const viewport = page.viewportSize()!;
		const box = (await button.boundingBox())!;
		expect(box.x + box.width).toBeGreaterThan(viewport.width - 64);
		expect(box.y).toBeLessThan(48);
		await button.click();
		const menu = page.getByRole('navigation', { name: 'Main' });
		await expect(menu).toBeVisible();
		await expect(menu.getByRole('link', { name: 'About', exact: true })).toHaveAttribute('href', '/about');
		await expect(menu.getByRole('link', { name: 'Projects', exact: true })).toHaveAttribute('href', '/#projects');
		await expect(menu.getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute('href', '/#contact-inside');
	});

	test('keeps the menu in its corner on a phone, with no sideways scroll', async ({ browser }) => {
		const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
		const page = await phone.newPage();
		await page.goto('/projects/hub-cultural-cabanyal');
		const box = (await page.getByRole('button', { name: 'Open menu' }).boundingBox())!;
		expect(box.x + box.width).toBeLessThanOrEqual(390);
		expect(box.x + box.width).toBeGreaterThan(390 - 48);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
		await phone.close();
	});

	test('takes Projects back home, onto the projects, leaving the address clean', async ({ page }) => {
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await page.goto('/projects/eduardo-calabuig');
		await openMenu(page);
		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Projects', exact: true }).click();
		// The curtain, home's load and its jump chain up: a CI runner rendering WebGL in software needs room.
		await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
		await expect.poll(() => page.locator('#projects').evaluate(element => Math.round(element.getBoundingClientRect().top)), { timeout: 15_000 }).toBe(0);
		await expect.poll(() => new URL(page.url()).hash).toBe('');
		expect(new URL(page.url()).pathname).toBe('/');
	});

	test('takes Contact back home, all the way down to the footer, leaving the address clean', async ({ page }) => {
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await page.goto('/projects/eduardo-calabuig');
		await openMenu(page);
		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Contact', exact: true }).click();
		// Home mounts the footer only once Anton has loaded: on a CI runner, seconds after the page itself. Until then
		// the page already ends at the portal's placeholder, so "at the bottom" alone proves nothing: wait for the footer.
		const footer = page.locator('footer#contact-inside');
		await expect(footer).toBeInViewport({ timeout: 15_000 });
		await expect
			.poll(() => page.evaluate(() => Math.round(scrollY + innerHeight) >= document.documentElement.scrollHeight - 1), { timeout: 15_000 })
			.toBe(true);
		await expect(footer).toBeInViewport();
		await expect.poll(() => new URL(page.url()).hash).toBe('');
	});

	test('stays out of search results until it has content', async ({ page, request }) => {
		await page.goto('/projects/ocaive');
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
		const sitemap = await (await request.get('/sitemap-0.xml')).text();
		expect(sitemap).not.toContain('/projects/');
	});
});
