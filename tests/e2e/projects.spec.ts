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
			await expect(page.getByRole('button', { name: `Open ${name}` })).toHaveCount(1);
		}
		await expect(page.getByText('Drag or swipe to explore')).toBeVisible();
		// Over the living backdrop: the section paints no stage colour of its own.
		await expect(page.locator('[data-projects]')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
		await expect(stage).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
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

	test('morphs the middle card into a dialog with visit and more-info actions', async ({ page }) => {
		await openSection(page);
		const box = (await page.locator(stageSelector).boundingBox())!;
		await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

		const dialog = page.getByRole('dialog', { name: 'Eduardo Calabuig' });
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('img', { name: 'Eduardo Calabuig website' })).toBeVisible();
		const visit = dialog.getByRole('link', { name: 'Visit site' });
		await expect(visit).toHaveAttribute('href', 'https://eduardocalabuig.com');
		await expect(visit).toHaveAttribute('target', '_blank');
		await expect(visit).toHaveCSS('background-color', 'rgb(91, 255, 46)');

		const more = dialog.getByRole('button', { name: 'More info' });
		await expect(more).toHaveAttribute('aria-expanded', 'false');
		await more.click();
		await expect(more).toHaveAttribute('aria-expanded', 'true');
		await expect(dialog.getByText('Interior design studio in Dénia')).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(dialog).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Open Eduardo Calabuig' })).toBeFocused();
	});

	test('brings a bent edge card to the middle instead of opening it', async ({ page }) => {
		await openSection(page);
		const stage = page.locator(stageSelector);
		const box = (await stage.boundingBox())!;
		const before = await stage.getAttribute('data-active');

		await page.mouse.click(box.x + box.width * 0.92, box.y + box.height / 2);
		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(stage).not.toHaveAttribute('data-active', before!);
	});

	test('opens a project from the keyboard', async ({ page }) => {
		await openSection(page);
		await page.getByRole('button', { name: 'Open ÒCAIVE' }).focus();
		await expect(page.locator(stageSelector)).toHaveAttribute('data-active', '1');
		await page.waitForTimeout(800);
		await page.keyboard.press('Enter');
		await expect(page.getByRole('dialog', { name: 'ÒCAIVE' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Visit site' })).toHaveAttribute('href', 'https://ocaive.com');
	});

	test('stops its animation loop once scrolled away', async ({ page }) => {
		await openSection(page);
		await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
		await expect(page.locator(stageSelector)).toHaveAttribute('data-running', 'false');
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

		await strip.getByRole('button', { name: 'Open Hub Cultural Cabanyal' }).click();
		await expect(page.getByRole('dialog', { name: 'Hub Cultural Cabanyal' })).toBeVisible();
	});
});
