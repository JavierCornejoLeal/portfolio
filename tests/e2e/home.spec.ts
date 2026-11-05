import { expect, test } from '@playwright/test';

test.describe('home page', () => {
	test('renders the incoming headline and tagline', async ({ page }) => {
		const response = await page.goto('/');

		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle('Javier Cornejo · Incoming');
		await expect(page.getByRole('heading', { level: 1, name: 'Incoming' })).toBeVisible();
		await expect(page.locator('main p', { hasText: 'Something big is on its way.' })).toBeVisible();
	});

	test('keeps the hero inside the viewport once the Silk canvas mounts', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('main canvas')).toBeAttached();

		const heading = page.getByRole('heading', { level: 1, name: 'Incoming' });
		await expect(heading).toBeInViewport();
		const box = await page.locator('main section').boundingBox();
		expect(box?.y).toBe(0);
	});

	test('centers the headline and tagline', async ({ page }) => {
		await page.goto('/');

		const viewport = page.viewportSize()!;
		for (const block of [
			page.getByRole('heading', { level: 1, name: 'Incoming' }),
			page.locator('main p', { hasText: 'Something big is on its way.' })
		]) {
			const box = (await block.boundingBox())!;
			expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(2);
			await expect(block).toHaveCSS('text-align', 'center');
		}
	});

	test('drops the header, email and phone', async ({ page }) => {
		await page.goto('/');

		await expect(page.locator('main header')).toHaveCount(0);
		await expect(page.getByText('Full stack developer')).toHaveCount(0);
		await expect(page.locator('a[href^="mailto:"], a[href^="tel:"]')).toHaveCount(0);
	});

	test('links to every social profile from the footer', async ({ page }) => {
		await page.goto('/');

		const links = page.locator('footer').getByRole('list', { name: 'Social links' }).getByRole('link');
		await expect(links).toHaveCount(3);
		await expect(page.getByRole('link', { name: /Instagram/ })).toHaveAttribute('href', 'https://www.instagram.com/javiiicornejo/');
		await expect(page.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', 'https://www.linkedin.com/in/cornejolealjavier/');
		await expect(page.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/JavierCornejoLeal');
		await expect(page.getByRole('link', { name: /Instagram/ })).toHaveCSS('pointer-events', 'auto');
	});

	test('keeps every contact link reachable on short viewports', async ({ page }) => {
		await page.setViewportSize({ width: 844, height: 390 });
		await page.goto('/');

		const footer = page.locator('footer p', { hasText: 'Designed and built by Javier Cornejo.' });
		await footer.scrollIntoViewIfNeeded();
		await expect(footer).toBeInViewport();
		await expect(page.getByRole('link', { name: /GitHub/ })).toBeInViewport();
	});

	test('announces external links that open in a new tab', async ({ page }) => {
		await page.goto('/');

		for (const name of ['Instagram', 'LinkedIn', 'GitHub']) {
			const link = page.getByRole('link', { name: new RegExp(name) });
			await expect(link).toHaveAttribute('target', '_blank');
			await expect(link).toHaveAccessibleName(/\(opens in a new tab\)$/);
		}
	});

	test('shows a social link as soon as it takes keyboard focus', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/');

		// Read the glyphs right after focusing, while their entrance delay is still running
		const animations = await page.evaluate(() => {
			const link = document.querySelector<HTMLAnchorElement>('ul[aria-label="Social links"] a');
			link?.focus();
			return [...link!.querySelectorAll('.curtain-letter')].map(glyph => getComputedStyle(glyph).animationName);
		});
		expect(animations.length).toBeGreaterThan(0);
		expect(new Set(animations)).toEqual(new Set(['none']));
	});

	test('reveals every piece of text with the curtain effect', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/');

		for (const block of ['main h1', 'main section > div > p', 'footer a', 'footer p']) {
			const glyphs = page.locator(`${block} .curtain-letter`);
			expect(await glyphs.count(), block).toBeGreaterThan(0);
			await expect(glyphs.first()).toHaveCSS('animation-name', 'curtain-rise');
		}
		// Glyphs start one after another, never all at once
		const starts = await page
			.locator('main section > div > p .curtain-letter')
			.evaluateAll(glyphs => glyphs.map(glyph => parseFloat(getComputedStyle(glyph).animationDelay)));
		expect(starts).toEqual([...starts].sort((a, b) => a - b));
		expect(starts.at(-1)!).toBeGreaterThan(starts[0]);
	});

	test('runs the footer curtain one glyph after another without overlaps', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/');

		const starts = await page
			.locator('footer .curtain-letter')
			.evaluateAll(glyphs => glyphs.map(glyph => parseFloat(getComputedStyle(glyph).animationDelay)));
		for (let i = 1; i < starts.length; i++) {
			expect(starts[i], `glyph ${i} starts after glyph ${i - 1}`).toBeGreaterThan(starts[i - 1]);
		}
	});

	test('freezes the Silk as soon as reduced motion turns on', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/');
		const canvas = page.locator('main canvas');
		await expect(canvas).toBeAttached();
		await page.mouse.move(640, 360);
		await page.mouse.down();
		await page.mouse.up();

		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.waitForTimeout(100);
		const first = await canvas.screenshot();
		await page.waitForTimeout(400);
		const second = await canvas.screenshot();
		expect(second.equals(first)).toBe(true);
	});

	test('does no animation work on pointer moves under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.addInitScript(() => {
			const counter = window as unknown as { silkFrames: number };
			counter.silkFrames = 0;
			const raf = window.requestAnimationFrame.bind(window);
			window.requestAnimationFrame = callback =>
				raf(time => {
					counter.silkFrames++;
					callback(time);
				});
		});
		await page.goto('/');
		await expect(page.locator('main canvas')).toBeAttached();
		await page.waitForTimeout(500);

		const before = await page.evaluate(() => (window as unknown as { silkFrames: number }).silkFrames);
		for (let i = 0; i < 20; i++) await page.mouse.move(200 + i * 40, 200 + i * 15);
		await page.waitForTimeout(800);
		const after = await page.evaluate(() => (window as unknown as { silkFrames: number }).silkFrames);

		// The pointer has no visible effect, so it must not wake the renderer at all
		expect(after - before).toBe(0);
	});

	test('shows the copyright footer', async ({ page }) => {
		await page.goto('/');

		const year = new Date().getFullYear();
		const footer = page.locator('footer p');
		await expect(footer).toBeVisible();
		await expect(footer.locator('.sr-only')).toHaveText(
			`© ${year} Javier Cornejo. All rights reserved. Designed and built by Javier Cornejo.`
		);
	});

	test('mounts the Silk background canvas behind the hero', async ({ page }) => {
		await page.goto('/');

		const canvas = page.locator('main canvas');
		await expect(canvas).toBeAttached();
		const viewport = page.viewportSize();
		// Silk sizes its canvas asynchronously, so retry until it fills the viewport
		await expect
			.poll(async () => {
				const box = await canvas.boundingBox();
				return box && { width: box.width, height: box.height };
			})
			.toEqual({ width: viewport?.width, height: viewport?.height });
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
