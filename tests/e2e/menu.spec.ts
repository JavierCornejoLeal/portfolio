import { expect, test, type Page } from '@playwright/test';

import { GLIDE_PATIENCE_MS } from '../../src/lib/glide';

/** The glass marks itself refracting once its displacement map is built: heavy JavaScript that a CI runner, which
 *  also renders the page's WebGL in software, can take well past the default 5s to finish. */
const GLASS_READY = 15_000;

const menuButton = (page: Page) => page.getByRole('button', { name: /^(Open|Close) menu$/ });
const menu = (page: Page) => page.getByRole('navigation', { name: 'Main' });

/** The visible part of the panel's reveal: its inset() clip, resolved against the element's size, and its radius. */
const reveal = (page: Page) =>
	page.locator('#site-menu .menu-reveal').first().evaluate(element => {
		const clip = getComputedStyle(element).clipPath;
		const { width, height } = element.getBoundingClientRect();
		const body = clip.slice(clip.indexOf('(') + 1, clip.lastIndexOf(')'));
		const [inset, round = '0px'] = body.split(' round ');
		// Split on spaces outside parentheses, then resolve px, % and calc(% - px) against the side's axis.
		const tokens: string[] = [];
		let depth = 0;
		let token = '';
		for (const char of inset.trim()) {
			if (char === '(') depth++;
			if (char === ')') depth--;
			if (char === ' ' && depth === 0) {
				if (token) tokens.push(token);
				token = '';
			} else token += char;
		}
		if (token) tokens.push(token);
		const resolve = (value: string, axis: number) => {
			const expression = value.replace(/^calc\(|\)$/g, '').replace(/([\d.]+)%/g, (_, n) => String((Number(n) / 100) * axis)).replace(/px/g, '');
			return Function(`return (${expression})`)() as number;
		};
		const [t, r = t, b = t, l = r] = tokens;
		const top = resolve(t, height);
		const right = resolve(r, width);
		const bottom = resolve(b, height);
		const left = resolve(l, width);
		return { shape: clip.split('(')[0], width: width - left - right, height: height - top - bottom, top, right, radius: parseFloat(round) };
	});

test.describe('menu', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
	});

	test('stretches the = button\'s own circle into the panel, like a drop spreading into a puddle', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/');
		await expect(page.locator('.place-in:has(button[aria-controls="site-menu"])')).toHaveCSS('opacity', '1');
		await page.waitForTimeout(1200);

		const button = menuButton(page);
		await expect(button).toHaveAccessibleName('Open menu');
		await expect(button).toHaveAttribute('aria-expanded', 'false');
		await expect(menu(page)).toHaveCount(0);
		const buttonBox = (await button.boundingBox())!;

		// Closed, the panel's shape is the button's circle exactly: same box, fully round, in the same corner.
		const closed = await reveal(page);
		expect(closed.shape).toBe('inset');
		expect(Math.abs(closed.width - buttonBox.width)).toBeLessThan(1);
		expect(Math.abs(closed.height - buttonBox.height)).toBeLessThan(1);
		expect(closed.radius).toBeCloseTo(buttonBox.width / 2, 0);
		expect(closed.top).toBeCloseTo(0, 0);
		expect(closed.right).toBeCloseTo(0, 0);

		await button.click();
		await expect(button).toHaveAccessibleName('Close menu');
		await expect(button).toHaveAttribute('aria-expanded', 'true');
		await expect(menu(page)).toBeVisible();
		const panel = (await page.locator('#site-menu').boundingBox())!;
		// Part way (held at 40% of its transition, whatever the machine's frame rate) it is a rounded shape between
		// the two, grown in both directions at once.
		await page.locator('#site-menu .menu-reveal').first().evaluate(element => {
			const transition = element.getAnimations().find(animation => (animation as CSSTransition).transitionProperty === 'clip-path')!;
			transition.pause();
			transition.currentTime = Number(transition.effect!.getComputedTiming().duration) * 0.4;
		});
		const mid = await reveal(page);
		expect(mid.width).toBeGreaterThan(buttonBox.width + 4);
		expect(mid.width).toBeLessThan(panel.width - 4);
		expect(mid.height).toBeGreaterThan(buttonBox.height + 4);
		expect(mid.height).toBeLessThan(panel.height - 4);
		await page.locator('#site-menu .menu-reveal').first().evaluate(element => element.getAnimations().forEach(animation => animation.play()));
		// Then it settles as the whole panel, with soft corners.
		await expect.poll(async () => (await reveal(page)).width, { timeout: 3_000 }).toBeCloseTo(panel.width, 0);
		// Settled: wait out the transition's last fraction (a slow runner can read 28.0028px) rather than demand 28 exactly.
		await expect.poll(async () => (await reveal(page)).radius, { timeout: 3_000 }).toBeCloseTo(28, 1);
		const open = await reveal(page);
		expect(open.height).toBeCloseTo(panel.height, 0);

		// The button sits in the panel's top right corner, and the panel is roomy.
		expect(Math.abs(panel.x + panel.width - (buttonBox.x + buttonBox.width))).toBeLessThan(2);
		expect(Math.abs(panel.y - buttonBox.y)).toBeLessThan(2);
		expect(panel.width).toBeGreaterThanOrEqual(416);
		expect(panel.height).toBeGreaterThan(buttonBox.height * 6);
	});

	test('makes the resting circle out of the very same glass as the panel', async ({ page }) => {
		await page.goto('/');
		const material = (selector: string) =>
			page.locator(selector).evaluate(el => {
				const style = getComputedStyle(el);
				const maps = [...el.querySelectorAll('feDisplacementMap')].map(map => map.getAttribute('scale'));
				return { body: style.backgroundColor, shadow: style.boxShadow, maps };
			});
		await expect(page.locator('button[aria-controls="site-menu"] [data-refract="true"]')).toHaveCount(1, { timeout: GLASS_READY });
		await menuButton(page).click();
		await expect(page.locator('#site-menu [data-refract="true"]')).toHaveCount(1, { timeout: GLASS_READY });
		const button = await material('button[aria-controls="site-menu"] [data-refract]');
		const panel = await material('#site-menu [data-refract]');
		expect(button).toEqual(panel);
		expect(panel.maps.length).toBe(3);
	});

	test('is one piece of glass: the button\'s circle hands over to the panel and takes it back', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/');
		const buttonGlass = page.locator('button[aria-controls="site-menu"] [data-refract]');
		const opacity = () => buttonGlass.evaluate(el => Number(getComputedStyle(el).opacity));
		expect(await opacity()).toBe(1);

		// Opening: the button's own glass gives way at once; the panel, shaped exactly like it, carries on.
		await menuButton(page).click();
		await expect.poll(opacity).toBe(0);
		await expect(buttonGlass).toHaveCSS('transition-delay', '0s');
		await page.waitForTimeout(1100);
		expect(await opacity()).toBe(0);

		// Closing: the panel shrinks back into the circle first; only then does the button's glass return.
		await menuButton(page).click();
		await expect(buttonGlass).toHaveCSS('transition-delay', '0.45s');
		expect(await opacity()).toBe(0);
		await expect.poll(opacity, { timeout: 2_000 }).toBe(1);
	});

	test('bends the page through real liquid glass, not a blur', async ({ page }) => {
		await page.goto('/');
		await menuButton(page).click();
		const glass = page.locator('#site-menu [data-refract="true"]');
		await expect(glass).toHaveCount(1, { timeout: GLASS_READY });
		// A strong lens: displacement of at least 48px, split per channel for chromatic aberration.
		const scales = await page.locator('#site-menu feDisplacementMap').evaluateAll(maps => maps.map(map => Number(map.getAttribute('scale'))));
		expect(scales.length).toBe(3);
		expect(Math.max(...scales)).toBeGreaterThanOrEqual(48 + 14);
		// Clear, not frosted: only a half-pixel blur in the backdrop.
		await expect(glass).toHaveCSS('backdrop-filter', /url\(.*\) blur\(0\.5px\)/);
		// The reveal clips the glass itself, never the nav around it (a clipped ancestor cuts the glass off from the page).
		await expect(page.locator('#site-menu')).toHaveCSS('clip-path', 'none');
	});

	test('lists every link in a column, in words only, with no Stack', async ({ page }) => {
		await page.goto('/');
		await menuButton(page).click();
		const nav = menu(page);

		for (const [name, href] of [['About', '/about'], ['Projects', '#projects'], ['Contact', '#contact-inside']]) {
			await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
		}
		await expect(nav.getByRole('link', { name: 'Stack' })).toHaveCount(0);
		for (const [name, href] of [
			['GitHub', 'https://github.com/JavierCornejoLeal'],
			['LinkedIn', 'https://www.linkedin.com/in/cornejolealjavier/'],
			['Instagram', 'https://www.instagram.com/javiiicornejo/']
		]) {
			const link = nav.getByRole('link', { name: new RegExp(`^${name}`) });
			await expect(link).toHaveAttribute('href', href);
			await expect(link).toHaveAttribute('target', '_blank');
			await expect(link).toHaveAccessibleName(`${name} (opens in a new tab)`);
		}
		// Big type, and no rule between the two groups.
		expect(parseFloat(await nav.getByRole('link', { name: 'About', exact: true }).evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(44);
		expect(parseFloat(await nav.getByRole('link', { name: /^GitHub/ }).evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(24);
		for (const list of await nav.getByRole('list').all()) await expect(list).toHaveCSS('border-top-width', '0px');
		// Text only: no icon in any link (the glass's own filter is the only svg in the panel).
		await expect(nav.locator('a svg, a img')).toHaveCount(0);
		// One above the other.
		const boxes = await Promise.all((await nav.getByRole('link').all()).map(link => link.boundingBox()));
		for (let i = 1; i < boxes.length; i++) expect(boxes[i]!.y).toBeGreaterThan(boxes[i - 1]!.y);
		expect(new Set(boxes.map(box => Math.round(box!.x))).size).toBe(1);
	});

	test('takes About to its own page', async ({ page }) => {
		await page.goto('/');
		await menuButton(page).click();
		await menu(page).getByRole('link', { name: 'About', exact: true }).click();
		await expect(page).toHaveURL(/\/about\/?$/);
	});

	test('leads with Home on the other pages, and leaves it out at home', async ({ page }) => {
		await page.goto('/');
		await menuButton(page).click();
		await expect(menu(page).getByRole('link', { name: 'Home', exact: true })).toHaveCount(0);

		for (const path of ['/about', '/projects/portfolio']) {
			await page.goto(path);
			await menuButton(page).click();
			const home = menu(page).getByRole('link', { name: 'Home', exact: true });
			await expect(home).toHaveAttribute('href', '/');
			await expect(menu(page).getByRole('link').first()).toHaveAccessibleName('Home');
		}
	});

	test('takes Home back to the home page', async ({ page }) => {
		await page.goto('/about');
		await menuButton(page).click();
		await menu(page).getByRole('link', { name: 'Home', exact: true }).click();
		await expect(page).toHaveURL(/\/$/);
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('rolls a link\'s letters on hover, keeping its name for screen readers', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/');
		await menuButton(page).click();
		await page.waitForTimeout(1000);
		const about = menu(page).getByRole('link', { name: 'About', exact: true });
		await expect(about.locator('[data-roll-letter]')).toHaveCount(0);

		await about.hover();
		await expect(about.locator('[data-roll-letter]')).toHaveCount('About'.length);
		await expect(about).toHaveAccessibleName('About');
		// Each hover plays it again.
		await page.mouse.move(5, 700);
		await about.hover();
		await expect(about.locator('[data-roll-letter]')).toHaveCount('About'.length);
		// Keyboard focus rolls it too.
		const projects = menu(page).getByRole('link', { name: 'Projects', exact: true });
		await projects.focus();
		await expect(projects.locator('[data-roll-letter]')).toHaveCount('Projects'.length);
	});

	test('every section link lands on something real', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('#projects')).toHaveCount(1);
		// The footer mounts with the contact portal on approach; Contact heads for the portal, which is always there
		// (the glide to the footer itself is covered below).
		await expect(page.locator('#contact')).toHaveCount(1);
	});

	test('takes Contact all the way down, even on a short screen where the footer is taller than the view', async ({ browser }) => {
		const short = await browser.newContext({ viewport: { width: 1280, height: 560 } });
		const page = await short.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await page.goto('/');
		await menuButton(page).click();
		await menu(page).getByRole('link', { name: 'Contact', exact: true }).click();
		// As patient as the glide itself: the footer mounts late on a slow runner (it waits for its font), and the glide
		// keeps going for up to GLIDE_PATIENCE_MS. Waiting less failed CI while the page was still on its way there.
		await expect
			.poll(() => page.evaluate(() => Math.round(scrollY + innerHeight) >= document.documentElement.scrollHeight - 1), {
				timeout: GLIDE_PATIENCE_MS + 3_000
			})
			.toBe(true);
		await expect(page.locator('footer#contact-inside').getByText(/©\d{4} — Javier Cornejo/)).toBeInViewport({ ratio: 1 });
		await short.close();
	});

	test('glides to the footer from Contact, so every way to get in touch is in view', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/');
		await menuButton(page).click();
		// Record the scroll position on every frame from the click on.
		await page.evaluate(() => {
			const samples: number[] = [];
			(window as unknown as { scrollSamples: number[] }).scrollSamples = samples;
			const tick = () => {
				samples.push(scrollY);
				if (samples.length < 240) requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
		});
		await menu(page).getByRole('link', { name: 'Contact', exact: true }).click();

		await expect(menu(page)).toHaveCount(0);
		// All the way down: the whole footer in view, its bottom line included, at the very end of the page.
		const atBottom = () => page.evaluate(() => Math.round(scrollY + innerHeight) >= document.documentElement.scrollHeight - 1);
		await expect.poll(atBottom, { timeout: 10_000 }).toBe(true);
		await expect(page.locator('footer#contact-inside').getByText(/©\d{4} — Javier Cornejo/)).toBeInViewport({ ratio: 1 });
		// Smooth, not a jump: the page passed through several positions on the way down.
		const target = await page.evaluate(() => scrollY);
		const samples = await page.evaluate(() => (window as unknown as { scrollSamples: number[] }).scrollSamples);
		const between = new Set(samples.filter(y => y > 0 && y < target - 1).map(Math.round));
		expect(between.size).toBeGreaterThanOrEqual(3);
		// And no #fragment in the address.
		expect(new URL(page.url()).hash).toBe('');
		await expect(page.locator('footer#contact-inside').getByRole('link', { name: /^Drop me an email/ })).toBeInViewport();
	});

	test('stays in the top right corner while the page scrolls', async ({ page }) => {
		await page.goto('/');
		// Let the button finish its entrance before measuring.
		await expect(page.locator('.place-in:has(button[aria-controls="site-menu"])')).toHaveCSS('opacity', '1');
		await page.waitForTimeout(1200);
		const before = (await menuButton(page).boundingBox())!;
		await page.locator('[data-projects]').evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY + 300, behavior: 'instant' }));
		const after = (await menuButton(page).boundingBox())!;
		expect(after).toEqual(before);
		await expect(menuButton(page)).toHaveCSS('pointer-events', 'auto');
		// Whatever is painted at the button's centre is the button.
		const onTop = await menuButton(page).evaluate((button, point) => button.contains(document.elementFromPoint(point.x, point.y)), {
			x: after.x + after.width / 2,
			y: after.y + after.height / 2
		});
		expect(onTop).toBe(true);
	});

	test('closes with Escape and gives focus back to the button', async ({ page }) => {
		await page.goto('/');
		await menuButton(page).click();
		await page.keyboard.press('Tab');
		await expect(menu(page).getByRole('link').first()).toBeFocused();

		await page.keyboard.press('Escape');
		await expect(menu(page)).toHaveCount(0);
		await expect(menuButton(page)).toBeFocused();
		await expect(menuButton(page)).toHaveAccessibleName('Open menu');
	});

	test('closes when clicking outside it or following a link', async ({ page }) => {
		await page.goto('/');
		await menuButton(page).click();
		await page.mouse.click(200, 500);
		await expect(menu(page)).toHaveCount(0);

		await menuButton(page).click();
		await menu(page).getByRole('link', { name: 'Projects', exact: true }).click();
		await expect(menu(page)).toHaveCount(0);
		await expect.poll(() => page.locator('#projects').evaluate(element => Math.round(element.getBoundingClientRect().top))).toBe(0);
		expect(new URL(page.url()).hash).toBe('');
	});

	test('keeps the closed panel out of reach of the keyboard and screen readers', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('#site-menu')).toHaveAttribute('inert', '');
		await menuButton(page).click();
		await expect(page.locator('#site-menu')).not.toHaveAttribute('inert', /.*/);
	});

	test('takes the whole screen on phones, with the = still top right and no dock', async ({ browser }) => {
		for (const [width, height] of [[320, 568], [393, 659]]) {
			const phone = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
			const page = await phone.newPage();
			await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
			await page.goto('/');

			// No dock: nothing pinned to the bottom, only the = in the corner (measured once its entrance is done).
			await expect(menu(page)).toHaveCount(0);
			await expect(page.locator('.place-in:has(button[aria-controls="site-menu"])')).toHaveCSS('opacity', '1');
			await page.waitForTimeout(1200);
			const button = (await menuButton(page).boundingBox())!;
			expect(button.x + button.width).toBeGreaterThan(width - 48);
			expect(button.y).toBeLessThan(48);

			await menuButton(page).click();
			await expect(menu(page)).toBeVisible();
			const panel = (await page.locator('#site-menu').boundingBox())!;
			expect(panel).toEqual({ x: 0, y: 0, width, height });
			// The = turned × stays put (its centre: hover may scale it), above the panel.
			const turned = (await menuButton(page).boundingBox())!;
			expect(Math.abs(turned.x + turned.width / 2 - (button.x + button.width / 2))).toBeLessThan(1);
			expect(Math.abs(turned.y + turned.height / 2 - (button.y + button.height / 2))).toBeLessThan(1);
			const onTop = await menuButton(page).evaluate((element, point) => element.contains(document.elementFromPoint(point.x, point.y)), {
				x: button.x + button.width / 2,
				y: button.y + button.height / 2
			});
			expect(onTop).toBe(true);
			// Every link fits on the screen, and the page under it does not scroll.
			for (const link of await menu(page).getByRole('link').all()) await expect(link).toBeInViewport({ ratio: 1 });
			await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
			expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);

			await menuButton(page).click();
			await expect(menu(page)).toHaveCount(0);
			await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden');
			await phone.close();
		}
	});

	test('appears at once under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await menuButton(page).click();
		await expect(page.locator('#site-menu .menu-reveal').first()).toHaveCSS('transition-duration', /^0s/);
		// No roll either: the words stay put.
		await menu(page).getByRole('link', { name: 'About', exact: true }).hover();
		await expect(menu(page).locator('[data-roll-letter]')).toHaveCount(0);
		await expect(menu(page)).toBeVisible();
	});
});
