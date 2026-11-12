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
		const slogan = page.locator('main p', { hasText: 'Code you can see through: sharp on the surface, solid all the way down.' });
		await expect(slogan).toBeVisible();
		await expect(slogan).not.toContainText('“');
		// No role line: the name stands alone.
		await expect(page.locator('section.hero').getByText('Full Stack Developer')).toHaveCount(0);
	});

	test('keeps the hero inside the viewport once the glass canvas mounts', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('[data-hero-bg] canvas')).toBeAttached();

		await expect(page.getByRole('heading', { level: 1, name: 'Javier Cornejo' })).toBeInViewport();
		await expect(page.getByRole('link', { name: 'Discover works' })).toBeInViewport();
		await expect(page.getByRole('button', { name: 'Open menu' })).toBeInViewport();
		const box = await page.locator('section.hero').boundingBox();
		expect(box?.y).toBe(0);
	});

	test('lays the hero out like a cover: menu on top, name centred, slogan and link along the foot', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('section.hero .place-in').last()).toHaveCSS('opacity', '1');
		const viewport = page.viewportSize()!;
		const box = async (locator: import('@playwright/test').Locator) => (await locator.boundingBox())!;

		const slogan = await box(page.locator('main p', { hasText: 'Code you can see through' }));
		const menu = await box(page.getByRole('button', { name: 'Open menu' }));
		// The visible letters, stretched wider than the h1's own box.
		const name = await box(page.locator('h1 .name-fade'));
		const link = await box(page.getByRole('link', { name: 'Discover works' }));

		// Menu top right.
		expect(menu.x + menu.width).toBeGreaterThan(viewport.width * 0.9);
		expect(menu.y).toBeLessThan(viewport.height * 0.15);
		// Name centred on one line, spanning most of the width.
		expect(Math.abs(name.x + name.width / 2 - viewport.width / 2)).toBeLessThan(4);
		expect(name.width).toBeGreaterThan(viewport.width * 0.9);
		// Big, but leaving half the screen to everything else.
		expect(name.height).toBeLessThan(viewport.height * 0.5);
		// Centred on the screen both ways.
		expect(Math.abs(name.y + name.height / 2 - viewport.height / 2)).toBeLessThan(4);
		// The letters span the screen edge to edge, grazing both sides, without making the page scroll sideways.
		expect(Math.abs(name.width - viewport.width)).toBeLessThan(12);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
		// Slogan bottom left as one long line of two at most, the link bottom right, both below the name.
		expect(slogan.y).toBeGreaterThan(name.y + name.height);
		expect(slogan.x).toBeLessThan(viewport.width * 0.1);
		expect(slogan.width).toBeGreaterThan(viewport.width * 0.4);
		expect(slogan.y + slogan.height).toBeGreaterThan(viewport.height * 0.8);
		expect(link.y).toBeGreaterThan(name.y + name.height);
		expect(link.x + link.width).toBeGreaterThan(viewport.width * 0.85);
		// Held in from the corners rather than pushed into them.
		expect(viewport.width - (link.x + link.width)).toBeGreaterThanOrEqual(56);
		expect(viewport.height - (link.y + link.height)).toBeGreaterThanOrEqual(56);
	});

	test('gives the content generous room from the edges while the menu stays in its corner', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('section.hero .place-in').last()).toHaveCSS('opacity', '1');
		const viewport = page.viewportSize()!;
		const insets = async (locator: import('@playwright/test').Locator) => {
			const box = (await locator.boundingBox())!;
			return { left: box.x, top: box.y, right: viewport.width - box.x - box.width, bottom: viewport.height - box.y - box.height };
		};

		const slogan = await insets(page.locator('main p', { hasText: 'Code you can see through' }));
		const link = await insets(page.getByRole('link', { name: 'Discover works' }));
		const menu = await insets(page.getByRole('button', { name: 'Open menu' }));

		expect(slogan.left).toBeGreaterThanOrEqual(64);
		expect(slogan.bottom).toBeGreaterThanOrEqual(56);
		expect(link.right).toBeGreaterThanOrEqual(64);
		expect(link.bottom).toBeGreaterThanOrEqual(56);
		expect(menu.top).toBeLessThanOrEqual(48);
		expect(menu.right).toBeLessThanOrEqual(48);
	});

	test('keeps at least 40px of air around the name on a laptop screen', async ({ browser }) => {
		const laptop = await browser.newContext({ viewport: { width: 1512, height: 783 } });
		const page = await laptop.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await page.goto('/');
		await expect(page.locator('section.hero .place-in').last()).toHaveCSS('opacity', '1');

		const name = (await page.locator('h1 .name-fade').boundingBox())!;
		const slogan = (await page.locator('main p', { hasText: 'Code you can see through' }).boundingBox())!;
		const menu = (await page.getByRole('button', { name: 'Open menu' }).boundingBox())!;
		expect(name.y - (menu.y + menu.height)).toBeGreaterThanOrEqual(40);
		expect(slogan.y - (name.y + name.height)).toBeGreaterThanOrEqual(40);
		// The hero itself fits the screen; the page goes on below it.
		expect((await page.locator('section.hero').boundingBox())!.height).toBe(783);
		await laptop.close();
	});

	test('runs the name edge to edge and widens the insets on large screens', async ({ browser }) => {
		const monitor = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
		const page = await monitor.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await page.goto('/');
		await expect(page.locator('section.hero .place-in').last()).toHaveCSS('opacity', '1');

		const name = (await page.locator('h1 .name-fade').boundingBox())!;
		const slogan = (await page.locator('main p', { hasText: 'Code you can see through' }).boundingBox())!;
		const link = (await page.getByRole('link', { name: 'Discover works' }).boundingBox())!;
		expect(name.width).toBeGreaterThan(1920 * 0.95);
		expect(slogan.x).toBeGreaterThanOrEqual(120);
		expect(1920 - (link.x + link.width)).toBeGreaterThanOrEqual(120);
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
		// Stretched like a cover through the individual `scale` property: a little wider, much taller.
		const [scaleX, scaleY] = await letters.evaluate(element => getComputedStyle(element).scale.split(' ').map(parseFloat));
		expect(scaleX).toBeGreaterThan(1.05);
		expect(scaleY).toBeGreaterThanOrEqual(1.85);
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
		// The box may pass the edge by the letters' side bearings; the ink itself is checked on CORNEJO below.
		expect(box.x + box.width).toBeLessThanOrEqual(396);
		// CORNEJO, the wider line, runs edge to edge. Measured on the word itself: the span's own box also spans
		// the 100vw word spacing that breaks the lines.
		const cornejo = await page.locator('h1 .name-fade').evaluate(element => {
			const text = element.firstChild!;
			const range = document.createRange();
			const start = text.textContent!.indexOf('Cornejo');
			range.setStart(text, start);
			range.setEnd(text, start + 'Cornejo'.length);
			const rect = range.getBoundingClientRect();
			return { left: rect.left, right: rect.right };
		});
		expect(Math.abs(cornejo.left)).toBeLessThan(6);
		expect(Math.abs(390 - cornejo.right)).toBeLessThan(6);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
		await phone.close();
	});

	test('has no call to action in the hero and no process section', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByRole('link', { name: "Let's talk" })).toHaveCount(0);
		await expect(page.locator('[data-process]')).toHaveCount(0);
	});

	test('leads to the projects through a link split in two refracting glass pieces', async ({ page }) => {
		await page.goto('/');

		const link = page.getByRole('link', { name: 'Discover works' });
		await expect(link).toHaveAttribute('href', '#projects');
		await expect(link).toHaveCSS('pointer-events', 'auto');
		const pieces = link.locator('[data-glass-piece]');
		await expect(pieces).toHaveCount(2);
		// Each piece is real glass: it bends the backdrop instead of painting a flat fill.
		// The glass marks itself refracting once its displacement map is built, which a CI runner (rendering WebGL in
		// software) can take past the default 5s to finish.
		await expect(link.locator('[data-refract="true"]')).toHaveCount(2, { timeout: 15_000 });
		// Each piece is shaped as a rounded trapezoid leaning into the other, not cut with a straight polygon.
		for (const glass of await link.locator('[data-refract]').all()) await expect(glass).toHaveCSS('clip-path', /^path\(/);

		// Each piece answers the pointer on its own: hovering one leaves the other at rest.
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		const [label, key] = await pieces.all();
		const scaled = (piece: import('@playwright/test').Locator) =>
			piece.evaluate(element => parseFloat(getComputedStyle(element).scale) || 1);
		await label.hover();
		await expect.poll(() => scaled(label)).toBeGreaterThan(1.04);
		expect(await scaled(key)).toBe(1);
		await key.hover();
		await expect.poll(() => scaled(key)).toBeGreaterThan(1.04);
		await expect.poll(() => scaled(label)).toBe(1);

		await link.click();
		// It glides there without writing a #fragment into the address.
		await expect.poll(() => page.locator('#projects').evaluate(element => Math.round(element.getBoundingClientRect().top))).toBe(0);
		expect(new URL(page.url()).hash).toBe('');
	});

	test('glides down to the projects when the link is followed', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/');
		const target = await page.locator('#projects').evaluate(element => element.getBoundingClientRect().top + scrollY);
		expect(target).toBeGreaterThan(0);

		await page.getByRole('link', { name: 'Discover works' }).click();
		// Smooth, not a jump: shortly after the click the page is on its way, not there yet.
		await page.waitForTimeout(80);
		const midway = await page.evaluate(() => scrollY);
		expect(midway).toBeLessThan(target - 1);
		// It lands with the projects at the top of the screen.
		await expect.poll(() => page.locator('#projects').evaluate(element => Math.round(element.getBoundingClientRect().top))).toBe(0);
	});

	test('jumps straight to the projects under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');

		await page.getByRole('link', { name: 'Discover works' }).click();
		expect(await page.locator('#projects').evaluate(element => Math.round(element.getBoundingClientRect().top))).toBe(0);
	});

	test('drops the old coming-soon copy, and keeps email and phone to the footer', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByText('Incoming')).toHaveCount(0);
		await expect(page.getByText('Something big is on its way')).toHaveCount(0);
		// The footer is the one place for the email and the phone.
		await expect(page.locator('a[href^="mailto:"]:not(footer a), a[href^="tel:"]:not(footer a)')).toHaveCount(0);
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
		const backgrounds = () => glass.evaluateAll(elements => elements.map(element => getComputedStyle(element).backgroundColor));
		await expect
			.poll(async () => (await backgrounds()).every(background => /^rgba\(7, 9, 7, 0\.[5-9]\d*\)$/.test(background)))
			.toBe(true);
		expect((await backgrounds()).length).toBeGreaterThan(0);
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
		// Ordered by how high each element sits: menu, name, then the slogan and link along the foot.
		const order = [
			await delayOf(page.getByRole('button', { name: 'Open menu' })),
			await delayOf(page.getByRole('heading', { level: 1 })),
			await delayOf(page.locator('main p', { hasText: 'Code you can see through' })),
			await delayOf(page.getByRole('link', { name: 'Discover works' }))
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
		const canvas = page.locator('[data-hero-bg] canvas');
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
		await expect(page.locator('[data-hero-bg] canvas')).toBeAttached();
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
		const canvas = page.locator('[data-hero-bg] canvas');
		await expect(canvas).toBeAttached();
		// Compare the glass alone: the hero text, its scrim and the living page backdrop behind the transparent
		// glass all move on their own.
		await page.addStyleTag({ content: 'main section, .hero-scrim, [data-living-gradient] { visibility: hidden !important; }' });

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
			// Wide window: the glass resumes within a frame or two, but each probe waits on input and screenshots,
			// which a loaded CI runner rendering WebGL in software slows down a lot.
			}, { timeout: 20_000 })
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

		// Start from the glass's own first guess (touch emulation reports no hovering pointer), so the pen's events
		// reach a mounted listener rather than racing the island's hydration on a slow runner.
		await expect(glass).toHaveAttribute('data-autoplay', 'on', { timeout: 15_000 });

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

	test('pins the statement over its living gradient while the paragraph reveals word by word', async ({ page }) => {
		await page.goto('/');
		const section = page.locator('[data-statement]');
		const pinned = section.locator(':scope > div');
		const words = section.locator('p > span');
		const metrics = await section.evaluate(element => ({ top: element.getBoundingClientRect().top + scrollY, height: (element as HTMLElement).offsetHeight }));
		const viewport = page.viewportSize()!;
		const scrollTo = (fraction: number) =>
			page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), metrics.top + (metrics.height - viewport.height) * fraction);
		const opacities = () => words.evaluateAll(elements => elements.map(element => Number(getComputedStyle(element).opacity)));

		// Entering: every word is still translucent.
		await scrollTo(0);
		await expect.poll(async () => Math.max(...(await opacities()))).toBeLessThan(0.3);

		// Halfway: the start of the paragraph is white, the end is not, and the content has not moved.
		await scrollTo(0.4);
		await expect.poll(async () => (await opacities())[0]).toBeGreaterThan(0.95);
		expect((await opacities()).at(-1)!).toBeLessThan(0.3);
		expect(await pinned.evaluate(element => element.getBoundingClientRect().top)).toBe(0);

		// Revealed: every word is white while the section still holds the screen.
		await scrollTo(0.86);
		await expect.poll(async () => Math.min(...(await opacities()))).toBeGreaterThan(0.95);
		expect(await pinned.evaluate(element => element.getBoundingClientRect().top)).toBe(0);

		// Only then does it scroll away.
		await scrollTo(1.2);
		await expect.poll(() => pinned.evaluate(element => element.getBoundingClientRect().top)).toBeLessThan(0);
	});

	test('reveals the statement within about a screen of scroll', async ({ page }) => {
		await page.goto('/');
		const viewport = page.viewportSize()!;
		// How long the paragraph stays pinned: the section's height beyond one screen.
		const pinnedFor = await page.locator('[data-statement]').evaluate(element => (element as HTMLElement).offsetHeight - innerHeight);
		expect(pinnedFor).toBeLessThanOrEqual(viewport.height * 1.05);
		expect(pinnedFor).toBeGreaterThanOrEqual(viewport.height * 0.8);
	});

	test('titles the statement "I build worlds", flush left with the text below it', async ({ page }) => {
		await page.goto('/');
		const section = page.locator('[data-statement]');
		const title = section.getByRole('heading', { level: 2 });
		await expect(title).toHaveAccessibleName('I build worlds');
		const titleLeft = (await title.boundingBox())!.x;
		const leadLeft = (await section.locator('p').first().boundingBox())!.x;
		expect(Math.abs(titleLeft - leadLeft)).toBeLessThan(2);
	});

	test('runs one living backdrop behind the whole page, which the hero melts into', async ({ page }) => {
		await page.goto('/');
		const viewport = page.viewportSize()!;
		const backdrop = page.locator('[data-living-gradient]');
		await expect(backdrop).toHaveCount(1);
		await expect(backdrop.locator('canvas')).toBeAttached();
		// Fixed behind everything, filling the screen wherever the page is scrolled.
		// The island wrapper sits in between, so find the holder by what it contains.
		const holder = page.locator('div.fixed', { has: backdrop });
		await expect(holder).toHaveCSS('position', 'fixed');
		await expect(holder).toHaveCSS('z-index', '-10');
		await page.locator('[data-statement]').evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY + 300, behavior: 'instant' }));
		const box = await backdrop.evaluate(element => {
			const rect = element.getBoundingClientRect();
			return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
		});
		expect(box).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });

		// No seam: the statement has no backdrop of its own, the hero's glass is transparent and fades out at its foot.
		await expect(page.locator('[data-statement] canvas')).toHaveCount(0);
		await expect(page.locator('[data-statement]')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
		await expect(page.locator('[data-hero-bg]')).toHaveCSS('mask-image', /linear-gradient/);
		await expect(page.locator('.hero-scrim')).toHaveCSS('mask-image', /linear-gradient/);
	});

	test('mounts the fluted glass canvas behind the hero', async ({ page }) => {
		await page.goto('/');

		const canvas = page.locator('[data-hero-bg] canvas');
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

		const section = page.locator('section.hero');
		await expect(section).toHaveCSS('pointer-events', 'none');
	});

	test('loads without runtime errors', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', error => errors.push(error.message));

		await page.goto('/');
		await expect(page.locator('[data-hero-bg] canvas')).toBeAttached();

		expect(errors).toEqual([]);
	});
});
