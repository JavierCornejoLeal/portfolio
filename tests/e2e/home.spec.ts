import { expect, test } from '@playwright/test';

test.describe('home page', () => {
	// These cover the page itself, so start as a returning visitor who already saw the loader.
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
	});

	test('names Javier in the main heading and says what he does', async ({ page }) => {
		const response = await page.goto('/');

		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle('Javier Cornejo');
		const name = page.getByRole('heading', { level: 1, name: 'Javier Cornejo' });
		await expect(name).toBeVisible();
		await expect(name).toHaveCSS('font-family', /Anton/);
		const slogan = page.locator('main p', { hasText: 'Code you can see through: clear, honest software' });
		await expect(slogan).toBeVisible();
		// Just the slogan: no quote mark, no role line under it.
		await expect(slogan).not.toContainText('“');
		await expect(page.getByText('Full stack developer', { exact: true })).toHaveCount(0);
	});

	test('keeps the hero inside the viewport once the glass canvas mounts', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('main canvas')).toBeAttached();

		await expect(page.getByRole('heading', { level: 1, name: 'Javier Cornejo' })).toBeInViewport();
		await expect(page.getByRole('link', { name: "Let's talk" })).toBeInViewport();
		await expect(page.getByRole('button', { name: 'Open menu' })).toBeInViewport();
		const box = await page.locator('main section').boundingBox();
		expect(box?.y).toBe(0);
	});

	test('lays the hero out like a cover: slogan and menu on top, name centred, contact below', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('.place-in').last()).toHaveCSS('opacity', '1');
		const viewport = page.viewportSize()!;
		const box = async (locator: import('@playwright/test').Locator) => (await locator.boundingBox())!;

		const slogan = await box(page.locator('main p', { hasText: 'Code you can see through' }));
		const menu = await box(page.getByRole('button', { name: 'Open menu' }));
		// The visible letters, stretched wider than the h1's own box.
		const name = await box(page.locator('h1 .name-fade'));
		const cta = await box(page.getByRole('link', { name: "Let's talk" }));

		// Slogan top left, menu top right.
		expect(slogan.x).toBeLessThan(viewport.width * 0.1);
		expect(slogan.y).toBeLessThan(viewport.height * 0.25);
		expect(menu.x + menu.width).toBeGreaterThan(viewport.width * 0.9);
		expect(menu.y).toBeLessThan(viewport.height * 0.15);
		// Name centred on one line, spanning most of the width.
		expect(Math.abs(name.x + name.width / 2 - viewport.width / 2)).toBeLessThan(4);
		expect(name.width).toBeGreaterThan(viewport.width * 0.9);
		expect(name.height).toBeLessThan(viewport.height * 0.35);
		expect(name.y).toBeGreaterThan(slogan.y + slogan.height);
		// Call to action bottom right, below the name.
		expect(cta.y).toBeGreaterThan(name.y + name.height);
		expect(cta.x + cta.width).toBeGreaterThan(viewport.width * 0.85);
		expect(cta.y + cta.height).toBeGreaterThan(viewport.height * 0.8);
		// Held in from the corner rather than pushed into it.
		expect(viewport.width - (cta.x + cta.width)).toBeGreaterThanOrEqual(56);
		expect(viewport.height - (cta.y + cta.height)).toBeGreaterThanOrEqual(56);
	});

	test('gives the content generous room from the edges while the menu stays in its corner', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('.place-in').last()).toHaveCSS('opacity', '1');
		const viewport = page.viewportSize()!;
		const insets = async (locator: import('@playwright/test').Locator) => {
			const box = (await locator.boundingBox())!;
			return { left: box.x, top: box.y, right: viewport.width - box.x - box.width, bottom: viewport.height - box.y - box.height };
		};

		const slogan = await insets(page.locator('main p', { hasText: 'Code you can see through' }));
		const cta = await insets(page.getByRole('link', { name: "Let's talk" }));
		const name = await insets(page.getByRole('heading', { level: 1 }));
		const menu = await insets(page.getByRole('button', { name: 'Open menu' }));

		expect(slogan.left).toBeGreaterThanOrEqual(64);
		expect(slogan.top).toBeGreaterThanOrEqual(56);
		expect(cta.right).toBeGreaterThanOrEqual(64);
		expect(cta.bottom).toBeGreaterThanOrEqual(56);
		// The name leaves breathing room above and below on a laptop-height screen.
		expect(name.top).toBeGreaterThan(slogan.top);
		expect(menu.top).toBeLessThanOrEqual(48);
		expect(menu.right).toBeLessThanOrEqual(48);
	});

	test('keeps at least 40px of air around the name on a laptop screen', async ({ browser }) => {
		const laptop = await browser.newContext({ viewport: { width: 1512, height: 783 } });
		const page = await laptop.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await page.goto('/');
		await expect(page.locator('.place-in').last()).toHaveCSS('opacity', '1');

		const name = (await page.locator('h1 .name-fade').boundingBox())!;
		const slogan = (await page.locator('main p', { hasText: 'Code you can see through' }).boundingBox())!;
		const cta = (await page.getByRole('link', { name: "Let's talk" }).boundingBox())!;
		expect(name.y - (slogan.y + slogan.height)).toBeGreaterThanOrEqual(40);
		expect(cta.y - (name.y + name.height)).toBeGreaterThanOrEqual(40);
		expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(783);
		await laptop.close();
	});

	test('runs the name edge to edge and widens the insets on large screens', async ({ browser }) => {
		const monitor = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
		const page = await monitor.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await page.goto('/');
		await expect(page.locator('.place-in').last()).toHaveCSS('opacity', '1');

		const name = (await page.locator('h1 .name-fade').boundingBox())!;
		const slogan = (await page.locator('main p', { hasText: 'Code you can see through' }).boundingBox())!;
		const cta = (await page.getByRole('link', { name: "Let's talk" }).boundingBox())!;
		expect(name.width).toBeGreaterThan(1920 * 0.95);
		expect(slogan.x).toBeGreaterThanOrEqual(120);
		expect(1920 - (cta.x + cta.width)).toBeGreaterThanOrEqual(120);
		await monitor.close();
	});

	test('draws the name in white fading to transparent towards its foot, with no rim', async ({ page }) => {
		await page.goto('/');

		const letters = page.getByRole('heading', { level: 1, name: 'Javier Cornejo' }).locator('.name-fade');
		await expect(letters).toHaveCSS('-webkit-text-fill-color', 'rgba(0, 0, 0, 0)');
		await expect(letters).toHaveCSS('background-clip', 'text');
		const gradient = await letters.evaluate(element => getComputedStyle(element).backgroundImage);
		expect(gradient).toContain('linear-gradient');
		expect(gradient).toMatch(/rgba\(233, 239, 230, 0\.3\)/);
		const stroke = await letters.evaluate(element => getComputedStyle(element).webkitTextStrokeWidth);
		expect(parseFloat(stroke)).toBe(0);
		// Stretched taller than its natural line.
		// Stretched like a cover through the individual `scale` property: wider and taller.
		const [scaleX, scaleY] = await letters.evaluate(element => getComputedStyle(element).scale.split(' ').map(parseFloat));
		expect(scaleX).toBeGreaterThan(1.05);
		expect(scaleY).toBeGreaterThanOrEqual(1.5);
	});

	test('stacks the name on two big lines on phones', async ({ browser }) => {
		const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
		const page = await phone.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await page.goto('/');

		const name = page.getByRole('heading', { level: 1, name: 'Javier Cornejo' });
		const fontSize = parseFloat(await name.evaluate(element => getComputedStyle(element).fontSize));
		const box = (await name.boundingBox())!;
		expect(fontSize).toBeGreaterThan(80);
		expect(box.height).toBeGreaterThan(fontSize * 1.5);
		expect(box.x + box.width).toBeLessThanOrEqual(390);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
		await phone.close();
	});

	test('sends the call to action to the contact section', async ({ page }) => {
		await page.goto('/');

		const cta = page.getByRole('link', { name: "Let's talk" });
		await expect(cta).toHaveAttribute('href', '#contact');
		await expect(cta).toHaveCSS('pointer-events', 'auto');
	});

	test('drops the old coming-soon copy, email and phone', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByText('Incoming')).toHaveCount(0);
		await expect(page.getByText('Something big is on its way')).toHaveCount(0);
		await expect(page.locator('a[href^="mailto:"], a[href^="tel:"]')).toHaveCount(0);
	});

	test('opens the glass dock from the menu button and turns it into a close button', async ({ page }) => {
		await page.goto('/');

		const menu = page.getByRole('button', { name: 'Open menu' });
		await expect(menu).toHaveAttribute('aria-expanded', 'false');
		await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);

		await menu.click();
		const close = page.getByRole('button', { name: 'Close menu' });
		await expect(close).toHaveAttribute('aria-expanded', 'true');
		const dock = page.getByRole('navigation', { name: 'Main' });
		await expect(dock).toBeVisible();

		for (const [name, href] of [['About', '#about'], ['Projects', '#projects'], ['Stack', '#stack'], ['Contact', '#contact']]) {
			await expect(dock.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
		}
		// Opens to the left of the button.
		const dockBox = (await dock.boundingBox())!;
		const buttonBox = (await close.boundingBox())!;
		expect(dockBox.x + dockBox.width).toBeLessThanOrEqual(buttonBox.x);

		await close.click();
		await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
	});

	test('links every social profile from the dock and announces new tabs', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		const dock = page.getByRole('navigation', { name: 'Main' });

		for (const [name, href] of [
			['GitHub', 'https://github.com/JavierCornejoLeal'],
			['LinkedIn', 'https://www.linkedin.com/in/cornejolealjavier/'],
			['Instagram', 'https://www.instagram.com/javiiicornejo/']
		]) {
			const link = dock.getByRole('link', { name: new RegExp(`^${name}`) });
			await expect(link).toHaveAttribute('href', href);
			await expect(link).toHaveAttribute('target', '_blank');
			await expect(link).toHaveAccessibleName(`${name} (opens in a new tab)`);
		}
	});

	test('closes the dock with Escape and gives focus back to the menu button', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await page.keyboard.press('Tab');
		await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link').first()).toBeFocused();

		await page.keyboard.press('Escape');
		await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
	});

	test('closes the dock when clicking outside it or following a link', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await page.mouse.click(200, 500);
		await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);

		await page.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Projects', exact: true }).click();
		await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
		await expect(page).toHaveURL(/#projects$/);
	});

	test('turns the menu into a dock pinned to the bottom on phones, always visible', async ({ browser }) => {
		for (const [width, height] of [[320, 568], [393, 659]]) {
			const phone = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
			const page = await phone.newPage();
			await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
			await page.goto('/');

			await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden();
			const dock = page.getByRole('navigation', { name: 'Main' });
			await expect(dock).toBeVisible();
			await expect(dock).toHaveCSS('position', 'fixed');
			for (const [name, href] of [['About', '#about'], ['Projects', '#projects'], ['Stack', '#stack'], ['Contact', '#contact']]) {
				await expect(dock.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
			}
			await expect(dock.getByRole('link', { name: 'GitHub (opens in a new tab)' })).toHaveAttribute('target', '_blank');

			const box = (await dock.boundingBox())!;
			expect(box.x).toBeGreaterThanOrEqual(0);
			expect(box.x + box.width).toBeLessThanOrEqual(width);
			expect(height - (box.y + box.height)).toBeLessThanOrEqual(24);
			// It never covers the call to action, and the page does not scroll sideways.
			const cta = (await page.getByRole('link', { name: "Let's talk" }).boundingBox())!;
			expect(cta.y + cta.height).toBeLessThanOrEqual(box.y);
			expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
			await phone.close();
		}
	});

	test('keeps the glass dark when the browser falls back to frosted glass, whatever the OS colour scheme', async ({ browser }) => {
		// Safari and Firefox cannot refract through an SVG backdrop filter; force that path and a light OS scheme.
		const context = await browser.newContext({ colorScheme: 'light' });
		await context.addInitScript(() => {
			sessionStorage.setItem('loader-seen', '1');
			const supports = CSS.supports.bind(CSS);
			CSS.supports = ((property: string, value?: string) =>
				value?.startsWith('url(') ? false : supports(property, value as string)) as typeof CSS.supports;
		});
		const page = await context.newPage();
		await page.goto('/');

		const glass = page.locator('[data-refract]');
		await expect(glass.first()).toBeAttached();
		// The fallback kicks in on the component's first effect, so wait for every surface to settle on it.
		await expect
			.poll(() => glass.evaluateAll(elements => elements.map(element => getComputedStyle(element).backgroundColor)))
			.toEqual(expect.arrayContaining([expect.stringMatching(/^rgba\(7, 9, 7, 0\.5\d*\)$/)]));
		const backgrounds = await glass.evaluateAll(elements => elements.map(element => getComputedStyle(element).backgroundColor));
		for (const background of backgrounds) expect(background).toMatch(/^rgba\(7, 9, 7, 0\.5\d*\)$/);
		await context.close();
	});

	test('brings the hero elements in from top to bottom', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/');

		const delayOf = (locator: import('@playwright/test').Locator) =>
			locator.evaluate(element => {
				const placed = element.closest('.place-in')!;
				const style = getComputedStyle(placed);
				return { name: style.animationName, delay: parseFloat(style.animationDelay) };
			});
		// Ordered by how high each element sits: menu, slogan, name, call to action.
		const order = [
			await delayOf(page.getByRole('button', { name: 'Open menu' })),
			await delayOf(page.locator('main p', { hasText: 'Code you can see through' })),
			await delayOf(page.getByRole('heading', { level: 1 })),
			await delayOf(page.getByRole('link', { name: "Let's talk" }))
		];
		for (const step of order) expect(step.name).toBe('place-in');
		const delays = order.map(step => step.delay);
		expect(delays).toEqual([...delays].sort((a, b) => a - b));
		expect(new Set(delays).size).toBe(delays.length);
	});

	test('places everything at once under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');

		const names = await page.locator('.place-in').evaluateAll(elements => elements.map(element => getComputedStyle(element).animationName));
		expect(names.length).toBeGreaterThan(0);
		expect(new Set(names)).toEqual(new Set(['none']));
	});

	test('freezes the glass background as soon as reduced motion turns on', async ({ page }) => {
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
			const counter = window as unknown as { glassFrames: number };
			counter.glassFrames = 0;
			const raf = window.requestAnimationFrame.bind(window);
			window.requestAnimationFrame = callback =>
				raf(time => {
					counter.glassFrames++;
					callback(time);
				});
		});
		await page.goto('/');
		await expect(page.locator('main canvas')).toBeAttached();
		const frames = () => page.evaluate(() => (window as unknown as { glassFrames: number }).glassFrames);
		// Wait for startup renders (resize, visibility) to finish so only pointer work is measured
		let settled = -1;
		await expect
			.poll(async () => {
				const now = await frames();
				const stable = now === settled;
				settled = now;
				return stable;
			}, { intervals: [300] })
			.toBe(true);

		const before = await frames();
		for (let i = 0; i < 20; i++) await page.mouse.move(200 + i * 40, 200 + i * 15);
		await page.waitForTimeout(800);
		const after = await frames();

		// The pointer has no visible effect, so it must not wake the renderer at all
		expect(after - before).toBe(0);
	});

	test('resumes the glass background after the WebGL context is lost and restored', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', error => errors.push(error.message));
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/');
		const canvas = page.locator('main canvas');
		await expect(canvas).toBeAttached();
		// Compare the background alone: the hero text and its scrim animate on their own.
		await page.addStyleTag({ content: 'main section, .hero-scrim { visibility: hidden !important; }' });

		await canvas.evaluate(async element => {
			const ext = (element as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!;
			ext.loseContext();
			await new Promise(resolve => setTimeout(resolve, 200));
			ext.restoreContext();
		});

		// A live renderer keeps moving (liquid stirred by the pointer, animated grain), so it never shows the same frame twice.
		await expect
			.poll(async () => {
				for (let i = 0; i < 10; i++) await page.mouse.move(300 + i * 60, 300 + i * 20);
				const first = await canvas.screenshot();
				await page.waitForTimeout(300);
				return first.equals(await canvas.screenshot());
			}, { timeout: 8000 })
			.toBe(false);
		expect(errors).toEqual([]);
	});

	test('keeps the glass dark for a mouse and autoplays it for touch', async ({ page, browser }) => {
		const glass = page.locator('main [data-autoplay]');
		await page.goto('/');
		await expect(glass).toHaveAttribute('data-autoplay', 'off');
		await page.mouse.move(400, 300);
		await expect(glass).toHaveAttribute('data-autoplay', 'off');

		const phone = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
		const mobile = await phone.newPage();
		await mobile.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await mobile.goto('/');
		// A fresh context mounts the WebGL island from scratch; give it room on a busy machine.
		await expect(mobile.locator('main [data-autoplay]')).toHaveAttribute('data-autoplay', 'on', { timeout: 10_000 });
		await phone.close();
	});

	test('switches autoplay with the pointer in use on hybrid touch-and-mouse devices', async ({ browser }) => {
		const hybrid = await browser.newContext({ hasTouch: true });
		const page = await hybrid.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await page.goto('/');
		const glass = page.locator('main [data-autoplay]');
		// Touch emulation reports no hovering pointer at all, so before any input it guesses touch.
		await expect(glass).toHaveAttribute('data-autoplay', 'on');

		// The media query says "no hover", but a mouse is what is actually in use: stay dark.
		await page.mouse.move(500, 320);
		await page.mouse.move(520, 340);
		await expect(glass).toHaveAttribute('data-autoplay', 'off');

		await page.touchscreen.tap(400, 300);
		await expect(glass).toHaveAttribute('data-autoplay', 'on');
		await hybrid.close();
	});

	test('treats a hovering pen like a mouse and a contact-only pen like a finger', async ({ browser }) => {
		const tablet = await browser.newContext({ hasTouch: true });
		const page = await tablet.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await page.goto('/');
		const glass = page.locator('main [data-autoplay]');
		const pen = (type: string, buttons: number) =>
			page.evaluate(
				([type, buttons]) =>
					window.dispatchEvent(new PointerEvent(type as string, { pointerType: 'pen', buttons: buttons as number, clientX: 400, clientY: 300 })),
				[type, buttons]
			);

		// A pen that touches down before it is ever seen hovering behaves like a finger.
		await pen('pointerdown', 1);
		await pen('pointermove', 1);
		await expect(glass).toHaveAttribute('data-autoplay', 'on');

		// Moving without contact proves it hovers: keep the surface dark like a mouse.
		await pen('pointermove', 0);
		await expect(glass).toHaveAttribute('data-autoplay', 'off');

		// Touching down again does not take that back.
		await pen('pointerdown', 1);
		await expect(glass).toHaveAttribute('data-autoplay', 'off');
		await tablet.close();
	});

	test('mounts the fluted glass canvas behind the hero', async ({ page }) => {
		await page.goto('/');

		const canvas = page.locator('main canvas');
		await expect(canvas).toBeAttached();
		const viewport = page.viewportSize();
		// The canvas is sized asynchronously, so retry until it fills the viewport
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
