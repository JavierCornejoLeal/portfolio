import { expect, test } from '@playwright/test';

test.describe('home page', () => {
	test('renders the incoming headline and tagline', async ({ page }) => {
		const response = await page.goto('/');

		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle('Javier Cornejo · Incoming');
		await expect(page.getByRole('heading', { level: 1, name: 'Incoming' })).toBeVisible();
		await expect(page.getByText('Something big is on its way.')).toBeVisible();
	});

	test('keeps the hero inside the viewport once the Silk canvas mounts', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('main canvas')).toBeAttached();

		const heading = page.getByRole('heading', { level: 1, name: 'Incoming' });
		await expect(heading).toBeInViewport();
		const box = await page.locator('main section').boundingBox();
		expect(box?.y).toBe(0);
	});

	test('links to every contact channel', async ({ page }) => {
		await page.goto('/');

		const links = page.getByRole('list', { name: 'Contact' }).getByRole('link');
		await expect(links).toHaveCount(5);
		await expect(page.getByRole('link', { name: /Instagram/ })).toHaveAttribute('href', 'https://www.instagram.com/javiiicornejo/');
		await expect(page.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', 'https://www.linkedin.com/in/cornejolealjavier/');
		await expect(page.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/JavierCornejoLeal');
		await expect(page.getByRole('link', { name: /Email/ })).toHaveAttribute('href', 'mailto:cornejolealjavier@gmail.com');
		await expect(page.getByRole('link', { name: /Phone/ })).toHaveAttribute('href', 'tel:+34634443602');
		await expect(page.getByRole('link', { name: /Instagram/ })).toHaveCSS('pointer-events', 'auto');
	});

	test('keeps every contact link reachable on short viewports', async ({ page }) => {
		await page.setViewportSize({ width: 844, height: 390 });
		await page.goto('/');

		const footer = page.getByText('Designed and built by Javier Cornejo.');
		await footer.scrollIntoViewIfNeeded();
		await expect(footer).toBeInViewport();
		await page.getByRole('link', { name: /Phone/ }).scrollIntoViewIfNeeded();
		await expect(page.getByRole('link', { name: /Phone/ })).toBeInViewport();
	});

	test('announces external links that open in a new tab', async ({ page }) => {
		await page.goto('/');

		for (const name of ['Instagram', 'LinkedIn', 'GitHub']) {
			const link = page.getByRole('link', { name: new RegExp(name) });
			await expect(link).toHaveAttribute('target', '_blank');
			await expect(link).toHaveAccessibleName(/\(opens in a new tab\)$/);
		}
		for (const name of ['Email', 'Phone']) {
			const link = page.getByRole('link', { name: new RegExp(name) });
			await expect(link).not.toHaveAttribute('target', '_blank');
			await expect(link).not.toHaveAccessibleName(/opens in a new tab/);
		}
	});

	test('shows a contact link as soon as it takes keyboard focus', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/');

		// Read opacity right after focusing, while the 1.4s entrance delay is still running
		const opacity = await page.evaluate(() => {
			const link = document.querySelector<HTMLAnchorElement>('ul[aria-label="Contact"] a');
			link?.focus();
			return getComputedStyle(link!.closest('ul')!).opacity;
		});
		expect(opacity).toBe('1');
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
		await expect(page.getByText(`© ${year} Javier Cornejo. All rights reserved.`)).toBeVisible();
		await expect(page.getByText('Designed and built by Javier Cornejo.')).toBeVisible();
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
