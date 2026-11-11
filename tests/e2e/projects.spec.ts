import { expect, test, type Page } from '@playwright/test';

const stageSelector = '[data-projects-stage]';

/** Scrolls the section into view, waits for its loop and lets the entrance finish. */
async function openSection(page: Page) {
	await page.goto('/');
	await page.locator(stageSelector).evaluate(stage => window.scrollTo({ top: stage.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
	await expect(page.locator(stageSelector)).toHaveAttribute('data-running', 'true');
	await page.waitForTimeout(2200);
}

test.describe('projects carousel', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
	});

	test('follows the statement with the three projects and a quiet hint', async ({ page }) => {
		await openSection(page);
		const stage = page.locator(stageSelector);

		const after = await page.evaluate(() => {
			const statement = document.querySelector('[data-statement]')!;
			const projects = document.querySelector('[data-projects]')!;
			return Boolean(statement.compareDocumentPosition(projects) & Node.DOCUMENT_POSITION_FOLLOWING);
		});
		expect(after).toBe(true);
		await expect(stage).toHaveAttribute('aria-roledescription', 'carousel');
		await expect(stage.locator('canvas')).toBeAttached();
		for (const name of ['Eduardo Calabuig', 'ÒCAIVE', 'Hub Cultural Cabanyal']) {
			// Links now: each opens its project's page.
			await expect(page.getByRole('link', { name: `Open ${name}` })).toHaveCount(1);
		}
		await expect(page.getByText('Drag or swipe to explore')).toBeVisible();
		// Over the living backdrop: the section paints no stage colour of its own.
		await expect(page.locator('[data-projects]')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
		await expect(stage).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
	});

	test('titles the section above the covers and rolls the title in letter by letter', async ({ page }) => {
		await openSection(page);
		const title = page.getByRole('heading', { level: 2, name: 'Featured projects' });
		await expect(title).toBeInViewport();
		const titleBox = (await title.boundingBox())!;
		const cardBox = (await page.locator('[data-project-anchor]').first().boundingBox())!;
		expect(titleBox.y + titleBox.height).toBeLessThan(cardBox.y);

		// One rolling letter per character, and once the roll ends every incoming face stands upright.
		const letters = title.locator('[data-roll-letter]');
		await expect(letters).toHaveCount('Featuredprojects'.length);
		await expect
			.poll(() => letters.evaluateAll(items => items.every(item => getComputedStyle(item.children[1]).transform === 'none')))
			.toBe(true);
	});

	test('shows the title still under reduced motion', async ({ browser }) => {
		const context = await browser.newContext({ reducedMotion: 'reduce' });
		const page = await context.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await openSection(page);
		const title = page.getByRole('heading', { level: 2, name: 'Featured projects' });
		await expect(title).toBeInViewport();
		await expect(title.locator('[data-roll-letter]')).toHaveCount(0);
		await context.close();
	});

	test('wraps the title between words, never inside one, on a phone', async ({ browser }) => {
		const phone = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
		const page = await phone.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await openSection(page);
		// Every letter of a word shares its line: the tops of "projects" letters are all equal.
		const tops = await page
			.locator('[data-roll-letter]')
			.evaluateAll(items => items.slice('Featured'.length).map(item => Math.round(item.getBoundingClientRect().top)));
		expect(new Set(tops).size).toBe(1);
		await phone.close();
	});

	// One WebGL page per test: two at once starve a CI runner that renders WebGL in software.
	test('sizes the covers at 45% of the width on desktop', async ({ page }) => {
		await openSection(page);
		const width = page.viewportSize()!.width;
		const middle = (await page.locator('[data-project-anchor]').first().boundingBox())!;
		expect(middle.width).toBeCloseTo(width * 0.45, 0);
		expect(middle.height).toBeCloseTo((width * 0.45) / 1.509, 0);
	});

	test('sizes the covers at 90% of the width on phones', async ({ browser }) => {
		const phone = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
		const page = await phone.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await openSection(page);
		expect((await page.locator('[data-project-anchor]').first().boundingBox())!.width).toBeCloseTo(393 * 0.9, 0);
		await phone.close();
	});

	test('steps with the arrow keys and returns home', async ({ page }) => {
		await openSection(page);
		const stage = page.locator(stageSelector);
		await stage.focus();
		await expect(stage).toHaveAttribute('data-active', '0');

		await page.keyboard.press('ArrowRight');
		await expect(stage).toHaveAttribute('data-active', '1');
		await page.keyboard.press('ArrowRight');
		await expect(stage).toHaveAttribute('data-active', '2');
		await page.keyboard.press('ArrowLeft');
		await expect(stage).toHaveAttribute('data-active', '1');
		await page.keyboard.press('Home');
		await expect(stage).toHaveAttribute('data-active', '0');
	});

	test('drags to the next project and leaves vertical wheel scrolling to the page', async ({ page }) => {
		await openSection(page);
		const stage = page.locator(stageSelector);
		const box = (await stage.boundingBox())!;
		const y = box.y + box.height / 2;

		await page.mouse.move(box.x + box.width * 0.6, y);
		await page.mouse.down();
		for (let step = 1; step <= 10; step++) await page.mouse.move(box.x + box.width * (0.6 - step * 0.025), y);
		await page.mouse.up();
		await expect(stage).toHaveAttribute('data-active', '1');

		// The page ends with this section, so scroll back up: the page moves, the strip does not.
		const before = await page.evaluate(() => scrollY);
		await page.mouse.wheel(0, -300);
		await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(before);
		await expect(stage).toHaveAttribute('data-active', '1');
	});

	test('opens the middle card\'s own page, with no preview on the way', async ({ page }) => {
		await openSection(page);
		const box = (await page.locator(stageSelector).boundingBox())!;
		await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
		await expect(page).toHaveURL(/\/projects\/eduardo-calabuig\/?$/);
		await expect(page.getByRole('heading', { level: 1, name: 'Eduardo Calabuig' })).toBeVisible();
	});

	test('keeps one invisible link per project over its card, with no flat copy of the cover', async ({ page }) => {
		await openSection(page);
		const anchors = page.locator('[data-project-anchor]');
		await expect(anchors).toHaveCount(3);
		await expect(anchors.locator('img')).toHaveCount(0);
		for (const [name, slug] of [['Eduardo Calabuig', 'eduardo-calabuig'], ['ÒCAIVE', 'ocaive'], ['Hub Cultural Cabanyal', 'hub-cultural-cabanyal']]) {
			await expect(page.getByRole('link', { name: `Open ${name}` })).toHaveAttribute('href', `/projects/${slug}`);
		}
	});

	test('brings a bent edge card to the middle instead of opening it', async ({ page }) => {
		await openSection(page);
		const stage = page.locator(stageSelector);
		const box = (await stage.boundingBox())!;
		const before = await stage.getAttribute('data-active');

		// The far edge: past the crisp neighbour, on the card that bends through the rim.
		await page.mouse.click(box.x + box.width * 0.98, box.y + box.height / 2);
		await expect(stage).not.toHaveAttribute('data-active', before!);
		expect(new URL(page.url()).pathname).toBe('/');
	});

	test('opens a project from the keyboard', async ({ page }) => {
		await openSection(page);
		await page.getByRole('link', { name: 'Open ÒCAIVE' }).focus();
		await expect(page.locator(stageSelector)).toHaveAttribute('data-active', '1');
		await page.waitForTimeout(800);
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/\/projects\/ocaive\/?$/);
	});

	test('stops its animation loop once scrolled away', async ({ page }) => {
		await openSection(page);
		await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
		await expect(page.locator(stageSelector)).toHaveAttribute('data-running', 'false');
	});

	test('draws nothing while the strip stands still', async ({ page }) => {
		// Count draw calls on the carousel's own canvas only.
		await page.addInitScript(() => {
			const counted = new WeakSet<WebGL2RenderingContext>();
			(window as unknown as { carouselDraws: number }).carouselDraws = 0;
			const original = WebGL2RenderingContext.prototype.drawElements;
			WebGL2RenderingContext.prototype.drawElements = function (this: WebGL2RenderingContext, ...args: Parameters<typeof original>) {
				if (counted.has(this) || (this.canvas as HTMLCanvasElement).closest?.('[data-projects-stage]')) {
					counted.add(this);
					(window as unknown as { carouselDraws: number }).carouselDraws++;
				}
				return original.apply(this, args);
			};
		});
		await openSection(page);
		const draws = () => page.evaluate(() => (window as unknown as { carouselDraws: number }).carouselDraws);
		expect(await draws()).toBeGreaterThan(0);

		// Hovering pauses the idle drift. Once the strip settles (sooner or later, depending on the machine's
		// frame rate), a half-second passes with frames ticking but nothing drawn.
		const box = (await page.locator(stageSelector).boundingBox())!;
		await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.85);
		await expect
			.poll(
				async () => {
					const start = await draws();
					await page.waitForTimeout(500);
					return (await draws()) - start;
				},
				{ timeout: 20_000 }
			)
			.toBe(0);
		const before = await draws();

		// Moving draws again.
		await page.locator(stageSelector).focus();
		await page.keyboard.press('ArrowRight');
		await expect.poll(draws).toBeGreaterThan(before);
	});

	test('stops drifting under a pointer that was already resting there when the section arrived', async ({ page }) => {
		// The pointer waits mid-screen while the page scrolls the section under it: the browser reports it as
		// already inside, so the carousel never sees it enter.
		await page.goto('/');
		const viewport = page.viewportSize()!;
		await page.mouse.move(viewport.width / 2, viewport.height * 0.85);
		const stage = page.locator(stageSelector);
		await stage.evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
		await expect(stage).toHaveAttribute('data-running', 'true');
		await page.waitForTimeout(2200);
		await page.mouse.move(viewport.width / 2 + 4, viewport.height * 0.85);

		// Hovering holds the strip still: the middle card stays exactly where it is.
		const middle = page.locator('[data-project-anchor]').first();
		const left = () => middle.evaluate(element => Math.round(element.getBoundingClientRect().left));
		await expect
			.poll(
				async () => {
					const start = await left();
					await page.waitForTimeout(700);
					return (await left()) - start;
				},
				{ timeout: 15_000 }
			)
			.toBe(0);
	});

	test('moves at once with reduced motion', async ({ browser }) => {
		const context = await browser.newContext({ reducedMotion: 'reduce' });
		const page = await context.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await page.goto('/');
		const stage = page.locator(stageSelector);
		await stage.evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
		await expect(stage).toHaveAttribute('data-running', 'true');
		await stage.focus();
		await page.keyboard.press('ArrowRight');
		// No easing: the very next check already sees the new card in the middle.
		expect(await stage.getAttribute('data-active')).toBe('1');
		await context.close();
	});

	test('falls back to a plain strip of covers without WebGL', async ({ page }) => {
		await page.addInitScript(() => {
			const original = HTMLCanvasElement.prototype.getContext;
			HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
				if (this.closest('[data-projects]') && type.startsWith('webgl')) return null;
				return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
			} as typeof original;
		});
		await page.goto('/');
		await page.locator(stageSelector).evaluate(stage => window.scrollTo({ top: stage.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
		const strip = page.locator('[data-projects-static]');
		await expect(strip.getByRole('img')).toHaveCount(3);
		await expect(page.locator(`${stageSelector} canvas`)).toHaveCount(0);

		await strip.getByRole('link', { name: 'Open Hub Cultural Cabanyal' }).click();
		await expect(page).toHaveURL(/\/projects\/hub-cultural-cabanyal\/?$/);
	});
});
