import { expect, test, type Page } from '@playwright/test';

const depth = (page: Page) => page.locator('[data-depth-image]');
/** The light's position in the picture, 0..1 from the left and from the bottom, as the component reports it. */
const light = async (page: Page) => (await depth(page).getAttribute('data-light'))!.split(',').map(Number);

test.describe('about page', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
	});

	test('exists at /about, black, opening on the statue', async ({ page }) => {
		const response = await page.goto('/about');
		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle(/About/);
		const main = page.locator('main');
		await expect(main).toHaveCSS('background-color', 'rgb(0, 0, 0)');
		const box = (await main.boundingBox())!;
		expect(box.height).toBeGreaterThanOrEqual(page.viewportSize()!.height);
		// The statue fills the first screen.
		const statue = (await depth(page).boundingBox())!;
		expect(Math.round(statue.width)).toBe(page.viewportSize()!.width);
		expect(Math.round(statue.height)).toBeGreaterThanOrEqual(page.viewportSize()!.height);
	});

	test('relights the statue with a light that follows the cursor', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/about');
		await expect(depth(page)).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
		await expect(depth(page).locator('canvas')).toBeVisible();
		const box = (await depth(page).boundingBox())!;

		await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.2);
		await expect.poll(async () => (await light(page))[0], { timeout: 5000 }).toBeGreaterThan(0.75);
		await expect.poll(async () => (await light(page))[1]).toBeGreaterThan(0.7);

		await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.8);
		await expect.poll(async () => (await light(page))[0], { timeout: 5000 }).toBeLessThan(0.25);
		await expect.poll(async () => (await light(page))[1]).toBeLessThan(0.3);
	});

	test('lets the light drift on its own while the cursor is away', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/about');
		await expect(depth(page)).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
		const first = await light(page);
		await expect.poll(async () => Math.hypot(...(await light(page)).map((v, i) => v - first[i])), { timeout: 5000 }).toBeGreaterThan(0.05);
	});

	test('holds the light still under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/about');
		await expect(depth(page)).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
		const first = await light(page);
		const box = (await depth(page).boundingBox())!;
		await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
		await page.waitForTimeout(800);
		expect(await light(page)).toEqual(first);
	});

	test('shows the photo as it is when WebGL is unavailable', async ({ page }) => {
		await page.addInitScript(() => {
			const original = HTMLCanvasElement.prototype.getContext;
			HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
				if (this.closest('[data-depth-image]') && type.startsWith('webgl')) return null;
				return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
			} as typeof original;
		});
		await page.goto('/about');
		const photo = depth(page).getByRole('img', { name: /statue/i });
		await expect(photo).toBeVisible();
		await expect.poll(() => photo.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
		await expect(depth(page).locator('canvas')).toHaveCount(0);
	});

	test('titles the page top right, under the menu, with a Roman slogan', async ({ page }) => {
		await page.goto('/about');
		const viewport = page.viewportSize()!;
		const title = page.getByRole('heading', { level: 1, name: 'About' });
		await expect(title).toBeVisible();
		await expect(title).toHaveCSS('font-family', /Anton/);
		await expect(page.getByText('Veni, vidi, deployed.')).toBeVisible();
		const box = (await title.boundingBox())!;
		const menu = (await page.getByRole('button', { name: 'Open menu' }).boundingBox())!;
		// Right aligned with the menu, just below it, in the top part of the screen.
		expect(Math.abs(box.x + box.width - (menu.x + menu.width))).toBeLessThan(4);
		expect(box.y).toBeGreaterThan(menu.y + menu.height);
		expect(box.y + box.height).toBeLessThan(viewport.height * 0.45);
	});

	test('lights the title and the slogan with the same light as the statue', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/about');
		await expect(depth(page)).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
		const title = page.getByRole('heading', { level: 1, name: 'About' });
		const box = (await title.boundingBox())!;
		// The light pool sits where the light is, measured from the title's own corner.
		const pool = () => title.evaluate(element => [parseFloat(element.style.getPropertyValue('--lx')), parseFloat(element.style.getPropertyValue('--ly'))]);
		await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
		await expect.poll(async () => Math.abs((await pool())[0] - box.width * 0.3), { timeout: 5000 }).toBeLessThan(12);
		await expect.poll(async () => Math.abs((await pool())[1] - box.height * 0.5)).toBeLessThan(12);
		await expect(title).toHaveCSS('background-image', /radial-gradient/);
		await expect(title).toHaveCSS('color', 'rgba(0, 0, 0, 0)');
	});

	test('stays out of search results until it has content', async ({ page, request }) => {
		await page.goto('/about');
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
		const sitemap = await (await request.get('/sitemap-0.xml')).text();
		expect(sitemap).not.toContain('/about');
	});

	test('carries the site\'s glass menu, its sections leading back home', async ({ page }) => {
		await page.goto('/about');
		const button = page.getByRole('button', { name: 'Open menu' });
		await expect(page.locator('astro-island[ssr]', { has: button })).toHaveCount(0, { timeout: 15_000 });
		await button.click();
		const menu = page.getByRole('navigation', { name: 'Main' });
		await expect(menu.getByRole('link', { name: 'Projects', exact: true })).toHaveAttribute('href', '/#projects');
		await expect(menu.getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute('href', '/#contact-inside');
	});
});
