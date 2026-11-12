import { expect, test, type Page } from '@playwright/test';

const stageSelector = '[data-projects-stage]';
const label = (page: Page) => page.locator('[data-cursor-label]');

/** Scrolls the projects into view and lets the carousel's entrance finish. */
async function openProjects(page: Page) {
	await page.goto('/');
	await page.locator(stageSelector).evaluate(stage => window.scrollTo({ top: stage.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
	await expect(page.locator(stageSelector)).toHaveAttribute('data-running', 'true', { timeout: 15_000 });
	await page.waitForTimeout(2200);
}

/** The middle card's centre, and a point well inside the card to its right, in page coordinates. */
async function cardPoints(page: Page) {
	const stage = (await page.locator(stageSelector).boundingBox())!;
	const middle = (await page.locator('[data-project-anchor]').first().boundingBox())!;
	const centre = { x: stage.x + stage.width / 2, y: stage.y + stage.height / 2 };
	return { centre, right: { x: centre.x + middle.width * 0.5 + 60, y: centre.y }, left: { x: centre.x - middle.width * 0.5 - 60, y: centre.y } };
}

test.describe('cursor label', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await page.emulateMedia({ reducedMotion: 'no-preference' });
	});

	test('is hidden away from the projects, leaving the normal cursor', async ({ page }) => {
		await page.goto('/');
		await page.mouse.move(300, 300);
		await expect(label(page)).toHaveAttribute('data-visible', 'false');
		await expect(page.locator('section.hero')).not.toHaveCSS('cursor', 'none');
	});

	test('reads View project over the middle card, in place of the arrow', async ({ page }) => {
		await openProjects(page);
		const { centre } = await cardPoints(page);
		await page.mouse.move(centre.x - 20, centre.y - 20);
		await page.mouse.move(centre.x, centre.y, { steps: 4 });

		await expect(label(page)).toHaveAttribute('data-visible', 'true');
		await expect(label(page)).toHaveText('View project');
		// It replaces the arrow over the stage, and is decorative: the cards keep their own names.
		await expect(page.locator(stageSelector)).toHaveCSS('cursor', 'none');
		await expect(label(page)).toHaveAttribute('aria-hidden', 'true');
		// It settles with its top left corner on the pointer.
		await expect
			.poll(async () => {
				const box = (await label(page).boundingBox())!;
				return Math.round(Math.hypot(box.x - centre.x, box.y - centre.y));
			})
			.toBeLessThan(3);
	});

	test('reads Next and Previous over the neighbours, which a click brings to the middle', async ({ page }) => {
		await openProjects(page);
		const { right, left } = await cardPoints(page);
		await page.mouse.move(right.x, right.y, { steps: 4 });
		await expect(label(page)).toHaveText('Next');
		await page.mouse.move(left.x, left.y, { steps: 8 });
		await expect(label(page)).toHaveText('Previous');
	});

	test('says nothing between the cards, leaving the normal cursor, and goes away off the stage', async ({ page }) => {
		await openProjects(page);
		const stage = (await page.locator(stageSelector).boundingBox())!;
		const { centre } = await cardPoints(page);
		await page.mouse.move(centre.x, centre.y, { steps: 4 });
		await expect(label(page)).toHaveAttribute('data-visible', 'true');
		// Below the covers: on the stage, on no card. No label, and the arrow is back.
		await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height * 0.9, { steps: 4 });
		await expect(label(page)).toHaveAttribute('data-visible', 'false');
		await expect(page.locator(stageSelector)).not.toHaveCSS('cursor', 'none');

		await page.locator('[data-statement]').evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY + 200, behavior: 'instant' }));
		await page.mouse.move(400, 300, { steps: 4 });
		await expect(label(page)).toHaveAttribute('data-visible', 'false');
	});

	test('inverts whatever sits behind it, so it shifts with every colour it crosses', async ({ page }) => {
		await openProjects(page);
		const { centre } = await cardPoints(page);
		await page.mouse.move(centre.x, centre.y, { steps: 4 });
		await expect(label(page)).toHaveAttribute('data-visible', 'true');
		// A white box with black words, blended by difference with the page: white turns the backdrop to its
		// complement, black lets it through.
		await expect(label(page)).toHaveCSS('mix-blend-mode', 'difference');
		const box = label(page).locator('.cursor-box');
		await expect(box).toHaveCSS('background-color', 'rgb(255, 255, 255)');
		await expect(box).toHaveCSS('color', 'rgb(0, 0, 0)');
		// Roomy enough to read at a glance.
		expect(parseFloat(await box.evaluate(el => getComputedStyle(el).paddingLeft))).toBeGreaterThanOrEqual(20);
		expect((await box.boundingBox())!.width).toBeGreaterThanOrEqual(140);
	});

	test('trails the pointer a little, then catches up', async ({ page }) => {
		await openProjects(page);
		const { centre } = await cardPoints(page);
		await page.mouse.move(centre.x, centre.y, { steps: 2 });
		await expect(label(page)).toHaveAttribute('data-visible', 'true');
		// A quick jump: right after it the label is still on its way.
		await page.mouse.move(centre.x + 60, centre.y + 40);
		const lag = await label(page).evaluate(element => {
			const box = element.getBoundingClientRect();
			return { x: box.x, y: box.y };
		});
		expect(Math.hypot(lag.x - (centre.x + 60), lag.y - (centre.y + 40))).toBeGreaterThan(2);
		await expect
			.poll(async () => {
				const box = (await label(page).boundingBox())!;
				return Math.round(Math.hypot(box.x - (centre.x + 60), box.y - (centre.y + 40)));
			})
			.toBeLessThan(3);
	});

	test('sticks to the pointer at once under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await openProjects(page);
		const { centre } = await cardPoints(page);
		await page.mouse.move(centre.x, centre.y, { steps: 2 });
		await expect(label(page)).toHaveAttribute('data-visible', 'true');
		await page.mouse.move(centre.x + 60, centre.y + 40);
		const box = (await label(page).boundingBox())!;
		expect(Math.round(Math.hypot(box.x - (centre.x + 60), box.y - (centre.y + 40)))).toBeLessThan(2);
	});

	test('never shows on touch screens, where there is no cursor to follow', async ({ browser }) => {
		const phone = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
		const page = await phone.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await page.goto('/');
		await expect(label(page)).toHaveCount(0);
		await phone.close();
	});

	test('leaves no trail behind the pointer: the cursor stays the normal one', async ({ page }) => {
		await page.goto('/');
		for (let i = 0; i < 8; i++) await page.mouse.move(300 + i * 30, 300 + i * 6);
		await expect(page.locator('[data-cursor-trail]')).toHaveCount(0);
	});
});
