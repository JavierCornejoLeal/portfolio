import { expect, test } from '@playwright/test';

const PROJECTS = ['ÒCAIVE', 'Eduardo Calabuig', 'Hub Cultural Cabanyal', 'Baleària internal tools'];

test.describe('home page', () => {
	test('introduces Javier with his name, role and a path to the work', async ({ page }) => {
		const response = await page.goto('/');

		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle('Javier Cornejo · Full stack developer');
		await expect(page.getByRole('heading', { level: 1, name: 'Javier Cornejo' })).toBeVisible();
		await expect(page.locator('#hero p').filter({ hasText: 'Full stack developer' }).first()).toBeVisible();
		await expect(page.getByRole('link', { name: 'See the work' })).toHaveAttribute('href', '#work');
	});

	test('lists every section in the main navigation', async ({ page }) => {
		await page.goto('/');

		const nav = page.getByRole('navigation', { name: 'Main' });
		for (const [label, href] of [
			['Work', '#work'],
			['Stack', '#stack'],
			['Experience', '#experience'],
			['Contact', '#contact']
		]) {
			await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', href);
		}
	});

	test('mounts the topographic field behind the page', async ({ page }) => {
		await page.goto('/');

		const canvas = page.locator('canvas[aria-hidden="true"]').first();
		await expect(canvas).toBeAttached();
		const viewport = page.viewportSize()!;
		await expect
			.poll(async () => {
				const box = await canvas.boundingBox();
				return box && { width: Math.round(box.width), height: Math.round(box.height) };
			})
			.toEqual({ width: viewport.width, height: viewport.height });
		const position = await canvas.evaluate(element => getComputedStyle(element.parentElement!.parentElement!).position);
		expect(position).toBe('fixed');
	});

	test('freezes the topographic field under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		const canvas = page.locator('canvas[aria-hidden="true"]').first();
		await expect(canvas).toBeAttached();
		await page.waitForTimeout(300);

		const first = await canvas.screenshot();
		await page.mouse.move(400, 300);
		await page.waitForTimeout(500);
		const second = await canvas.screenshot();
		expect(second.equals(first)).toBe(true);
	});

	test('walks the project carousel with buttons, keyboard and the station rail', async ({ page }) => {
		await page.goto('/');
		const carousel = page.getByRole('region', { name: 'Selected projects' });
		await carousel.scrollIntoViewIfNeeded();

		const showing = (name: string) => expect(carousel.getByRole('heading', { level: 3, name, exact: true })).toBeVisible();
		await showing(PROJECTS[0]);

		await carousel.getByRole('button', { name: 'Next project' }).click();
		await showing(PROJECTS[1]);

		await carousel.getByRole('button', { name: 'Next project' }).focus();
		await page.keyboard.press('ArrowRight');
		await showing(PROJECTS[2]);

		await page.keyboard.press('ArrowLeft');
		await showing(PROJECTS[1]);

		const stations = carousel.getByRole('list', { name: 'Project stations' }).getByRole('button');
		await expect(stations).toHaveCount(PROJECTS.length);
		await stations.nth(3).click();
		await showing(PROJECTS[3]);
		await expect(stations.nth(3)).toHaveAttribute('aria-current', 'step');

		// Wraps around from the last station to the first
		await carousel.getByRole('button', { name: 'Next project' }).click();
		await showing(PROJECTS[0]);
	});

	test('links each public project to its live site in a new tab', async ({ page }) => {
		await page.goto('/');
		const carousel = page.getByRole('region', { name: 'Selected projects' });
		await carousel.scrollIntoViewIfNeeded();

		const link = carousel.getByRole('link', { name: /Visit ocaive\.com/ });
		await expect(link).toHaveAttribute('href', 'https://ocaive.com/');
		await expect(link).toHaveAttribute('target', '_blank');
		await expect(link).toHaveAccessibleName(/\(opens in a new tab\)$/);
	});

	test('labels the Baleària image as an illustration, not a capture', async ({ page }) => {
		await page.goto('/');
		const carousel = page.getByRole('region', { name: 'Selected projects' });
		await carousel.scrollIntoViewIfNeeded();
		await carousel.getByRole('list', { name: 'Project stations' }).getByRole('button').nth(3).click();

		await expect(carousel.getByText('Illustration · internal tools are confidential')).toBeVisible();
		await expect(carousel.getByRole('link', { name: /Visit/ })).toHaveCount(0);
	});

	test('lists the stack by group', async ({ page }) => {
		await page.goto('/');

		const stack = page.locator('#stack');
		for (const group of ['Frontend', 'Backend', 'Data', 'Delivery']) {
			await expect(stack.getByRole('heading', { level: 3, name: group })).toBeAttached();
		}
		await expect(stack.getByRole('listitem').filter({ hasText: 'Spring Boot' })).toHaveCount(1);
	});

	test('shows work experience and education', async ({ page }) => {
		await page.goto('/');

		const experience = page.locator('#experience');
		await expect(experience.getByRole('heading', { level: 3, name: 'Huming' })).toBeAttached();
		await expect(experience.getByRole('heading', { level: 3, name: 'Baleària' })).toBeAttached();
		await expect(experience.getByText('Public Works Engineering')).toBeAttached();
	});

	test('offers email and every social profile in the contact close', async ({ page }) => {
		await page.goto('/');

		const contact = page.locator('#contact');
		await expect(contact.getByRole('link', { name: 'cornejolealjavier@gmail.com' })).toHaveAttribute(
			'href',
			'mailto:cornejolealjavier@gmail.com'
		);
		const socials = contact.getByRole('list', { name: 'Social links' }).getByRole('link');
		await expect(socials).toHaveCount(3);
		for (const [name, href] of [
			['LinkedIn', 'https://www.linkedin.com/in/cornejolealjavier/'],
			['GitHub', 'https://github.com/JavierCornejoLeal'],
			['Instagram', 'https://www.instagram.com/javiiicornejo/']
		]) {
			const link = contact.getByRole('link', { name: new RegExp(name) });
			await expect(link).toHaveAttribute('href', href);
			await expect(link).toHaveAttribute('target', '_blank');
			await expect(link).toHaveAccessibleName(/\(opens in a new tab\)$/);
		}
	});

	test('shows the copyright footer', async ({ page }) => {
		await page.goto('/');

		const year = new Date().getFullYear();
		await expect(page.locator('footer p').first()).toHaveText(
			`© ${year} Javier Cornejo. Designed and built by Javier Cornejo.`
		);
	});

	test('keeps every section visible when scripts never run', async ({ browser }) => {
		const context = await browser.newContext({ javaScriptEnabled: false });
		const page = await context.newPage();
		await page.goto('/');

		for (const id of ['work', 'stack', 'experience', 'contact']) {
			await expect(page.locator(`#${id} h2`)).toHaveCSS('opacity', '1');
		}
		await context.close();
	});

	test('never scrolls sideways on a phone', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/');

		const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
		expect(overflow).toBe(0);
	});

	test('reveals the hero text with the curtain effect, one glyph after another', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/');

		const glyphs = page.locator('h1 .curtain-letter');
		expect(await glyphs.count()).toBeGreaterThan(0);
		await expect(glyphs.first()).toHaveCSS('animation-name', 'curtain-rise');
		const starts = await glyphs.evaluateAll(items => items.map(item => parseFloat(getComputedStyle(item).animationDelay)));
		expect(starts).toEqual([...starts].sort((a, b) => a - b));
		expect(starts.at(-1)!).toBeGreaterThan(starts[0]);
	});
});
