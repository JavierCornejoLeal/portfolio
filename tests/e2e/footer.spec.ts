import { expect, test, type Page } from '@playwright/test';

const footer = 'footer#contact-inside';

/** Scrolls through the contact portal to the footer that waits in its green. */
async function openFooter(page: Page, { ready = 15_000 } = {}) {
	await page.goto('/');
	await page.locator('[data-contact]').evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
	await expect(page.locator('[data-contact] section')).toHaveAttribute('data-gp-ready', 'true', { timeout: ready });
	await page.locator(footer).evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
	await expect(page.locator('[data-contact] section')).toHaveAttribute('data-gp-entered', 'true');
}

/** RGB channels of a computed CSS colour. */
const channels = (colour: string) => colour.match(/[\d.]+/g)!.slice(0, 4).map(Number);

test.describe('footer', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await page.emulateMedia({ reducedMotion: 'no-preference' });
	});

	test('waits in the contact portal\'s green, as the page\'s footer', async ({ page }) => {
		await openFooter(page);

		const element = page.locator(footer);
		await expect(element).toHaveRole('contentinfo');
		await expect(element).toBeInViewport();
		await expect(page.locator(`[data-contact] [data-gp-content] ${footer}`)).toHaveCount(1);
		await expect.poll(() => element.evaluate(el => Number(getComputedStyle(el.closest('[data-gp-content]')!).opacity))).toBeGreaterThan(0.95);
	});

	test('is exactly the green the camera flies through, with no seam where they meet', async ({ page }) => {
		await openFooter(page);

		// One flat colour on both sides of the seam: the portal's field and the footer.
		const field = await page.locator('[data-contact] [data-gp-field] > div').evaluate(el => {
			const style = getComputedStyle(el);
			return { colour: style.backgroundColor, image: style.backgroundImage };
		});
		const own = await page.locator(footer).evaluate(el => {
			const style = getComputedStyle(el);
			return { colour: style.backgroundColor, image: style.backgroundImage };
		});
		expect(field).toEqual({ colour: 'rgb(5, 42, 3)', image: 'none' });
		expect(own).toEqual(field);
	});

	test('starts to rise as soon as the camera is through, after little more than a screen of zoom', async ({ page }) => {
		await openFooter(page);
		const section = page.locator('[data-contact] section');
		// Scroll into the section until the footer's top edge just enters at the bottom of the screen.
		const lead = await page.locator(footer).evaluate(el => {
			const section = el.closest('section')!;
			return (el.getBoundingClientRect().top + scrollY) - (section.getBoundingClientRect().top + scrollY) - innerHeight;
		});
		const height = page.viewportSize()!.height;
		expect(lead).toBeLessThanOrEqual(height * 1.15);
		// By then the camera is through: the green fills the screen, unclipped.
		await section.evaluate((el, lead) => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + lead + 2, behavior: 'instant' }), lead);
		await expect(page.locator('[data-contact] [data-gp-field]')).toHaveCSS('clip-path', 'none');
	});

	test('rises with the page, plainly, with no fade', async ({ page }) => {
		await openFooter(page);
		// Footer top half-way up the screen: it is already fully there, not fading in.
		await page.locator(footer).evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - innerHeight * 0.5, behavior: 'instant' }));
		await expect(page.locator(footer).getByRole('heading', { level: 2 })).toBeInViewport();
		const opacity = await page.locator(footer).evaluate(el => {
			let value = 1;
			for (let node: Element | null = el; node; node = node.parentElement) value *= Number(getComputedStyle(node).opacity);
			return value;
		});
		expect(opacity).toBe(1);
		// Its links answer right away.
		await expect(page.locator(`${footer} [data-footer-pill]`).first()).toHaveCSS('pointer-events', 'auto');
		await expect(page.locator(footer)).toHaveCSS('filter', 'none');
		await expect(page.locator(footer)).toHaveCSS('backdrop-filter', 'none');
	});

	test('opens with a big line and liquid-glass pills, with room to breathe', async ({ page }) => {
		await openFooter(page);
		const viewport = page.viewportSize()!;
		const top = (await page.locator(footer).boundingBox())!.y;

		const heading = page.locator(footer).getByRole('heading', { level: 2 });
		await expect(heading).toHaveText(/Let.s build\s*something clear\./);
		const headingBox = (await heading.boundingBox())!;
		expect(parseFloat(await heading.evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(40);
		// Air above the line, from the top of the footer.
		expect(headingBox.y - top).toBeGreaterThanOrEqual(72);

		const pills = page.locator(`${footer} [data-footer-pill]`);
		expect(await pills.count()).toBeGreaterThanOrEqual(2);
		for (const pill of await pills.all()) {
			// Real glass that bends what sits behind it.
			await expect(pill.locator('[data-refract]')).toHaveCount(1);
			await expect(pill).toHaveAttribute('href', /^(https:\/\/|mailto:|tel:)/);
		}
		// The first pill writes an email.
		const email = page.locator(footer).getByRole('link', { name: /^Drop me an email/ });
		await expect(email).toHaveAttribute('href', 'mailto:cornejolealjavier@gmail.com');
		await expect(email).toHaveAttribute('data-footer-pill');
		await expect(page.locator(footer).getByRole('link', { name: /Write me on LinkedIn/ })).toHaveCount(0);
		// Plain text and an arrow, no @ sign.
		await expect(email).toHaveText('Drop me an email');
		await expect(email.locator('svg.lucide-at-sign')).toHaveCount(0);
		await expect(email.locator('svg.lucide-arrow-right')).toHaveCount(1);
		// See this code opens this very portfolio's source.
		await expect(page.locator(footer).getByRole('link', { name: /^See this code/ })).toHaveAttribute('href', 'https://github.com/JavierCornejoLeal/portfolio');
		await expect(page.locator(footer).getByRole('link', { name: /^See my code/ })).toHaveCount(0);
		const pillsBottom = Math.max(...(await Promise.all((await pills.all()).map(async pill => { const b = (await pill.boundingBox())!; return b.y + b.height; }))));
		expect(pillsBottom - (headingBox.y + headingBox.height)).toBeGreaterThanOrEqual(28);

		// The social list keeps clear of the screen's right edge.
		const socials = (await page.locator(footer).getByRole('list', { name: 'Elsewhere' }).boundingBox())!;
		expect(viewport.width - (socials.x + socials.width)).toBeGreaterThanOrEqual(32);
		expect(socials.y - top).toBeGreaterThanOrEqual(72);

		// Clear space between the top block and the name.
		const name = (await page.locator(`${footer} [data-footer-name]`).boundingBox())!;
		expect(name.y - pillsBottom).toBeGreaterThanOrEqual(48);
	});

	// One WebGL page per test: a CI runner renders WebGL in software, and a wide page takes it a long while to
	// hydrate, so each screen gets its own test and extra time rather than sharing one 30s budget.
	for (const [width, height] of [[1512, 783], [1728, 960], [2000, 975]]) {
		test(`fits the whole footer on one ${width}x${height} screen`, async ({ browser }) => {
			test.slow();
			const screen = await browser.newContext({ viewport: { width, height } });
			const page = await screen.newPage();
			await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
			await openFooter(page, { ready: 30_000 });

			const box = (await page.locator(footer).boundingBox())!;
			expect(box.height).toBeLessThanOrEqual(height);
			await expect(page.locator(footer).getByText(/©\d{4} — Javier Cornejo/)).toBeInViewport();
			await expect(page.locator(`${footer} [data-footer-name]`)).toBeInViewport({ ratio: 1 });
			await screen.close();
		});
	}

	test('lists the phone under the profiles, set just like them', async ({ page }) => {
		await openFooter(page);

		const socials = page.locator(footer).getByRole('list', { name: 'Elsewhere' });
		const links = socials.getByRole('link');
		await expect(links.last()).toHaveText('+34 634 44 36 02');
		await expect(links.last()).toHaveAttribute('href', 'tel:+34634443602');
		// Calling stays on the page: no new tab.
		await expect(links.last()).not.toHaveAttribute('target', /.+/);
		// Same face, size and weight as Instagram above it.
		const style = (name: string) => socials.getByRole('link', { name: new RegExp(`^${name.replace('+', '\\+')}`) }).evaluate(el => {
			const s = getComputedStyle(el);
			return [s.fontFamily, s.fontSize, s.fontWeight, s.color].join('|');
		});
		expect(await style('+34 634 44 36 02')).toBe(await style('Instagram'));
		const instagram = (await socials.getByRole('link', { name: /^Instagram/ }).boundingBox())!;
		const phone = (await links.last().boundingBox())!;
		expect(phone.y).toBeGreaterThan(instagram.y);
		expect(Math.abs(phone.x - instagram.x)).toBeLessThan(2);
	});

	test('lists every social profile, the same ones as the menu', async ({ page }) => {
		await openFooter(page);

		const socials = page.locator(footer).getByRole('list', { name: 'Elsewhere' });
		for (const [name, href] of [
			['LinkedIn', 'https://www.linkedin.com/in/cornejolealjavier/'],
			['GitHub', 'https://github.com/JavierCornejoLeal'],
			['Instagram', 'https://www.instagram.com/javiiicornejo/']
		]) {
			const link = socials.getByRole('link', { name: new RegExp(`^${name}`) });
			await expect(link).toHaveAttribute('href', href);
			await expect(link).toHaveAttribute('target', '_blank');
		}
	});

	test('sets JAVIER into the green, as if pressed into it', async ({ page }) => {
		await openFooter(page);

		const name = page.locator(`${footer} [data-footer-name]`);
		await expect(name).toHaveText('Javier');
		await expect(name).toHaveAttribute('aria-hidden', 'true');
		await expect(name).toHaveCSS('font-family', /Anton/);
		// One line.
		const lineHeight = parseFloat(await name.evaluate(el => getComputedStyle(el).lineHeight));
		expect((await name.boundingBox())!.height).toBeLessThan(lineHeight * 1.5);
		// The fill is green, a shade darker than the green around it, not a grey veil.
		const [r, g, b] = channels(await name.evaluate(el => getComputedStyle(el).color));
		expect(g).toBeGreaterThan(r);
		expect(g).toBeGreaterThan(b);
		expect(g).toBeLessThan(42);
		// A lit lower lip and a shaded upper edge.
		const shadow = await name.evaluate(el => getComputedStyle(el).textShadow);
		expect(shadow.match(/rgba\(/g)!.length).toBeGreaterThanOrEqual(2);
		expect(shadow).toMatch(/rgba\(0, 0, 0, 0\.\d+\)/);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
	});

	test('holds the green to the very bottom of the page, with nothing after it', async ({ page }) => {
		await openFooter(page);
		await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));

		const bottom = await page.locator(footer).evaluate(el => Math.round(el.getBoundingClientRect().bottom + scrollY));
		expect(bottom).toBe(await page.evaluate(() => document.documentElement.scrollHeight));
	});

	test('closes with the current year, the name and a small nav', async ({ page }) => {
		// Whatever year the visitor's clock says, not the year the site was built. A frozen clock also freezes the
		// portal's camera, so read the line without flying in.
		await page.clock.setFixedTime(new Date('2031-05-01T12:00:00'));
		await page.goto('/');
		await page.locator('[data-contact]').evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
		await expect(page.locator(footer)).toContainText('©2031 — Javier Cornejo, full stack developer');
		// The bottom line holds only the year and the name; the phone lives with the profiles.
		await expect(page.locator(footer).getByText(/©2031 — Javier Cornejo, full stack developer$/)).toHaveCount(1);
		const nav = page.locator(footer).getByRole('navigation', { name: 'Footer' });
		await expect(nav.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '#projects');
		await expect(nav.getByRole('link', { name: 'Back to top' })).toHaveAttribute('href', '#top');
		await expect(page.locator('#top')).toHaveCount(1);
	});

	test('shows HELLO again on the way back down after using a footer link', async ({ page }) => {
		await openFooter(page);
		await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
		// A link in the footer keeps the focus after it is used.
		await page.locator(footer).getByRole('navigation', { name: 'Footer' }).getByRole('link', { name: 'Back to top' }).click();
		await expect.poll(() => page.evaluate(() => scrollY), { timeout: 10_000 }).toBe(0);

		// Scroll back down into the portal, early in the zoom: the word is still a window onto the green, not a wall.
		const section = page.locator('[data-contact] section');
		await section.evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY + innerHeight * 0.2, behavior: 'instant' }));
		await expect.poll(async () => Number(await section.getAttribute('data-gp-progress'))).toBeGreaterThan(0);
		await expect(page.locator('[data-contact] [data-gp-field]')).toHaveCSS('clip-path', /url/);
	});

	test('glides back to the top from the footer, leaving the address clean', async ({ page }) => {
		await openFooter(page);
		await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
		await page.locator(footer).getByRole('navigation', { name: 'Footer' }).getByRole('link', { name: 'Back to top' }).click();
		await expect.poll(() => page.evaluate(() => scrollY), { timeout: 10_000 }).toBe(0);
		expect(new URL(page.url()).hash).toBe('');
	});

	test('ends with the bottom line fully on a phone screen and never scrolls sideways', async ({ browser }) => {
		const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
		const page = await phone.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await openFooter(page);
		await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));

		const line = (await page.locator(footer).getByText(/©\d{4} — Javier Cornejo/).boundingBox())!;
		// The phone number never breaks across lines.
		const number = page.locator(footer).getByRole('link', { name: '+34 634 44 36 02' });
		const lineHeight = parseFloat(await number.evaluate(el => getComputedStyle(el).lineHeight));
		expect((await number.boundingBox())!.height).toBeLessThan(lineHeight * 1.5);
		// No dock any more: the line sits at the very end of the page, all of it in view.
		expect(line.y + line.height).toBeLessThanOrEqual(844);
		expect(844 - (line.y + line.height)).toBeLessThan(140);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
		await phone.close();
	});
});
