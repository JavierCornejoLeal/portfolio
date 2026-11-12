import { expect, test, type Page } from '@playwright/test';

const curtain = '[data-curtain]';

/** Records every curtain that appears, with its columns' colour and timing, before the page leaves. */
async function watchCurtain(page: Page) {
	await page.addInitScript(() => {
		const seen: { columns: number; colour: string; name: string; delays: number[] }[] = [];
		(window as unknown as { curtains: typeof seen }).curtains = seen;
		new MutationObserver(() => {
			const element = document.querySelector('[data-curtain]');
			if (!element || element.hasAttribute('data-recorded')) return;
			element.setAttribute('data-recorded', '');
			const columns = [...element.children] as HTMLElement[];
			const style = getComputedStyle(columns[0]);
			seen.push({
				columns: columns.length,
				colour: style.backgroundColor,
				name: style.animationName,
				delays: columns.map(column => parseFloat(getComputedStyle(column).animationDelay))
			});
			sessionStorage.setItem('curtains', JSON.stringify(seen));
		}).observe(document, { childList: true, subtree: true });
	});
}
const recorded = (page: Page) =>
	page.evaluate(() => JSON.parse(sessionStorage.getItem('curtains') ?? '[]') as { columns: number; colour: string; name: string; delays: number[] }[]);

test.describe('page curtain', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await page.emulateMedia({ reducedMotion: 'no-preference' });
	});

	test('draws black columns up the screen, once, before About opens', async ({ page }) => {
		await watchCurtain(page);
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'About', exact: true }).click();

		// The curtain covers the page while it is still home.
		await expect(page.locator(curtain)).toBeVisible();
		await expect(page.locator(curtain)).toHaveCSS('position', 'fixed');
		expect(new URL(page.url()).pathname).toBe('/');

		await expect(page).toHaveURL(/\/about\/?$/);
		const [first, ...rest] = await recorded(page);
		expect(rest).toHaveLength(0);
		expect(first.columns).toBeGreaterThanOrEqual(5);
		expect(first.colour).toBe('rgb(0, 0, 0)');
		expect(first.name).toBe('curtain-rise');
		// A staircase: the rightmost column first, each one to its left a beat later.
		for (let i = 1; i < first.delays.length; i++) expect(first.delays[i - 1]).toBeGreaterThan(first.delays[i]);

		// The page it opens shows plainly: no curtain, no loader of its own.
		await expect(page.locator(curtain)).toHaveCount(0);
		await expect(page.locator('.page-loader')).toHaveCount(0);
		await expect(page.locator('main')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
	});

	test('draws it before a project opens from the carousel', async ({ page }) => {
		await watchCurtain(page);
		await page.goto('/');
		await page.locator('[data-projects-stage]').evaluate(stage => window.scrollTo({ top: stage.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
		await expect(page.locator('[data-projects-stage]')).toHaveAttribute('data-running', 'true', { timeout: 15_000 });
		await page.waitForTimeout(2200);
		const box = (await page.locator('[data-projects-stage]').boundingBox())!;
		await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

		await expect(page.locator(curtain)).toBeVisible();
		await expect(page).toHaveURL(/\/projects\/eduardo-calabuig\/?$/);
		expect(await recorded(page)).toHaveLength(1);
	});

	test('leaves in-page links to their glide', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Projects', exact: true }).click();
		await expect(page.locator(curtain)).toHaveCount(0);
		await expect.poll(() => page.locator('#projects').evaluate(element => Math.round(element.getBoundingClientRect().top))).toBe(0);
	});

	test('goes straight there under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await watchCurtain(page);
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'About', exact: true }).click();
		await expect(page).toHaveURL(/\/about\/?$/);
		expect(await recorded(page)).toHaveLength(0);
	});

	test('is gone when Back restores the page', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'About', exact: true }).click();
		await expect(page).toHaveURL(/\/about\/?$/);
		await page.goBack();
		await expect(page).toHaveURL(/\/$/);
		await expect(page.locator(curtain)).toHaveCount(0);
	});

	test('opens again on the page it lands on, the columns drawing back up to reveal it', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'About', exact: true }).click();
		await expect(page).toHaveURL(/\/about\/?$/);

		// The same black columns, now drawing back up, the rightmost first.
		const reveal = page.locator('[data-curtain-in]');
		const columns = reveal.locator('span');
		expect(await columns.count()).toBeGreaterThanOrEqual(5);
		await expect(columns.first()).toHaveCSS('background-color', 'rgb(0, 0, 0)');
		await expect(columns.first()).toHaveCSS('animation-name', 'curtain-reveal');
		await expect(columns.first()).toHaveCSS('transform-origin', /^\S+ 0px$/);
		const delays = await columns.evaluateAll(elements => elements.map(element => parseFloat(getComputedStyle(element).animationDelay)));
		for (let i = 1; i < delays.length; i++) expect(delays[i - 1]).toBeGreaterThan(delays[i]);
		// It never blocks the page, and it is gone once open.
		await expect(reveal).toHaveCSS('pointer-events', 'none');
		await expect(reveal).toBeHidden({ timeout: 3_000 });
	});

	test('reveals a project page the same way, its title rising as it opens', async ({ page }) => {
		await page.goto('/');
		await page.locator('[data-projects-stage]').evaluate(stage => window.scrollTo({ top: stage.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
		await page.getByRole('link', { name: 'Open ÒCAIVE' }).focus();
		await page.waitForTimeout(800);
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/\/projects\/ocaive\/?$/);
		await expect(page.locator('[data-curtain-in]')).toBeAttached();
		const first = page.getByRole('heading', { level: 1 }).locator('[data-letter]').first();
		expect(parseFloat(await first.evaluate(element => getComputedStyle(element).animationDelay))).toBeGreaterThanOrEqual(0.4);
	});

	test('shows a page opened directly with no curtain', async ({ page }) => {
		await page.goto('/about');
		await expect(page.locator('[data-curtain-in]')).toBeHidden();
		await page.goto('/projects/ocaive');
		await expect(page.locator('[data-curtain-in]')).toBeHidden();
		const first = page.getByRole('heading', { level: 1 }).locator('[data-letter]').first();
		expect(parseFloat(await first.evaluate(element => getComputedStyle(element).animationDelay))).toBeLessThan(0.3);
	});

	test('draws no curtain back under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'About', exact: true }).click();
		await expect(page).toHaveURL(/\/about\/?$/);
		await expect(page.locator('[data-curtain-in]')).toBeHidden();
	});

	test('takes Projects from About back home behind the same black curtain, opening right on the projects', async ({ page }) => {
		await watchCurtain(page);
		await page.goto('/about');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Projects', exact: true }).click();

		// Leaving: one black curtain rises, the same as on the way out.
		await expect(page.locator(curtain)).toBeVisible();
		await expect(page).toHaveURL(/\/$/);
		const [leaving, ...more] = await recorded(page);
		expect(more).toHaveLength(0);
		expect(leaving.colour).toBe('rgb(0, 0, 0)');

		// Landing: home starts covered by that same black, already on the projects, then the curtain opens there.
		const reveal = page.locator('[data-curtain-in]');
		await expect(reveal.locator('span').first()).toHaveCSS('background-color', 'rgb(0, 0, 0)');
		await expect(page.locator('html')).not.toHaveClass(/curtain-hold/, { timeout: 5_000 });
		// No glide: the projects are in place the moment the curtain starts to open.
		expect(await page.locator('#projects').evaluate(element => Math.round(element.getBoundingClientRect().top))).toBe(0);
		expect(new URL(page.url()).hash).toBe('');
		await expect(reveal).toBeHidden({ timeout: 3_000 });
	});

	test('takes Contact from a project back home, opening on the whole footer once it is there', async ({ page }) => {
		await page.goto('/projects/ocaive');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Contact', exact: true }).click();
		// The menu's glass, the curtain and home's load chain up: a CI runner rendering WebGL in software needs room.
		await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
		// Held shut until the footer has mounted and the page is at its end, then opened.
		await expect(page.locator('html')).not.toHaveClass(/curtain-hold/, { timeout: 15_000 });
		expect(await page.evaluate(() => Math.round(scrollY + innerHeight) >= document.documentElement.scrollHeight - 1)).toBe(true);
		await expect(page.locator('footer#contact-inside')).toBeInViewport();
		expect(new URL(page.url()).hash).toBe('');
	});

	test('keeps the curtain shut for a late footer, as long as the way down to it is still waiting', async ({ page }) => {
		// A slow device: home's footer lives in the contact portal, which here arrives four and a half seconds late
		// (past the four the curtain used to wait, well inside the glide's patience even on a slow CI runner).
		await page.route(/ContactPortal[^/]*\.js/, async route => {
			await new Promise(resolve => setTimeout(resolve, 4500));
			await route.continue();
		});
		await page.goto('/projects/ocaive');
		const button = page.getByRole('button', { name: 'Open menu' });
		await expect(page.locator('astro-island[ssr]', { has: button })).toHaveCount(0, { timeout: 15_000 });
		await button.click();
		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Contact', exact: true }).click();
		await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
		// The moment it opens, the footer is already there and on screen: not the empty portal, with the footer
		// arriving after.
		const atOpen = await page.evaluate(
			() =>
				new Promise<{ footer: boolean; onScreen: boolean }>(resolve => {
					const check = () => {
						if (document.documentElement.classList.contains('curtain-hold')) return requestAnimationFrame(check);
						const footer = document.querySelector('footer#contact-inside');
						const rect = footer?.getBoundingClientRect();
						resolve({ footer: Boolean(footer), onScreen: Boolean(rect && rect.top < innerHeight && rect.bottom > 0) });
					};
					check();
				})
		);
		expect(atOpen).toEqual({ footer: true, onScreen: true });
	});

	test('opens the black curtain on the page the browser\'s Back button returns to', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'About', exact: true }).click();
		await expect(page).toHaveURL(/\/about\/?$/);
		await expect(page.locator('[data-curtain-in]')).toBeHidden({ timeout: 3_000 });

		await page.goBack();
		await expect(page).toHaveURL(/\/$/);
		// Home comes back covered in black, which draws back up to show it; the curtain that left is gone.
		await expect(page.locator('html')).toHaveClass(/curtain-in/);
		const columns = page.locator('[data-curtain-in] span');
		await expect(columns.first()).toHaveCSS('background-color', 'rgb(0, 0, 0)');
		await expect(columns.first()).toHaveCSS('animation-name', 'curtain-reveal');
		await expect(page.locator(curtain)).toHaveCount(0);
		await expect(page.locator('[data-curtain-in]')).toBeHidden({ timeout: 3_000 });
	});

	test('opens it when Back returns to a project page too', async ({ page }) => {
		await page.goto('/projects/ocaive');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'About', exact: true }).click();
		await expect(page).toHaveURL(/\/about\/?$/);
		await page.goBack();
		await expect(page).toHaveURL(/\/projects\/ocaive\/?$/);
		await expect(page.locator('html')).toHaveClass(/curtain-in/);
		await expect(page.locator('[data-curtain-in]')).toBeHidden({ timeout: 3_000 });
	});
});
