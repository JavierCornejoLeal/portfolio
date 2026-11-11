import { expect, test, type Page } from '@playwright/test';

const visibleLine = '[data-process-line]:visible';

async function openSection(page: Page) {
	await page.goto('/');
	await page.locator('[data-process]').evaluate(section => window.scrollTo({ top: section.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
}

test.describe('process section', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
	});

	test('follows the projects with a rolling "Process" title top left and one line on how I work', async ({ page }) => {
		await openSection(page);
		const after = await page.evaluate(() => {
			const projects = document.querySelector('[data-projects]')!;
			const process = document.querySelector('[data-process]')!;
			return Boolean(projects.compareDocumentPosition(process) & Node.DOCUMENT_POSITION_FOLLOWING);
		});
		expect(after).toBe(true);

		const title = page.getByRole('heading', { level: 2, name: 'Process' });
		await expect(title).toBeInViewport();
		const viewport = page.viewportSize()!;
		const titleBox = (await title.boundingBox())!;
		expect(titleBox.x).toBeLessThan(viewport.width * 0.1);
		expect(titleBox.y).toBeLessThan((await page.locator(visibleLine).boundingBox())!.y);
		await expect(title.locator('[data-roll-letter]')).toHaveCount('Process'.length);

		await expect(page.locator('[data-process-lede]')).toHaveText(
			'Like a production line: every stage hands over something you can see and test before the next one starts.'
		);
	});

	test('lays out the line large, across the width', async ({ page }) => {
		await openSection(page);
		const viewport = page.viewportSize()!;
		const line = (await page.locator(visibleLine).boundingBox())!;
		expect(line.width).toBeGreaterThan(viewport.width * 0.85);
		expect(line.height).toBeGreaterThan(viewport.height * 0.6);
	});

	test('runs the stations in order, with build split into three parallel lanes', async ({ page }) => {
		await openSection(page);
		await expect(page.locator('[data-process] ol li')).toHaveText([
			'01 Discover: Goals, users and scope',
			'02 Design: Architecture, data model and UI',
			'03 Interface: Responsive, accessible UI',
			'03 API: Business logic and auth',
			'03 Data: Schema and migrations',
			'04 Test: Automated tests and CI',
			'05 Ship: Deploy, review, hand over',
			'06 Operate: Monitor and improve',
			'Then a feedback loop from operation back to discovery.'
		]);

		const stations = page.locator(`${visibleLine} [data-step]`);
		await expect(stations).toHaveCount(8);
		const centre = (id: string) =>
			stations
				.and(page.locator(`[data-step="${id}"]`))
				.locator('div')
				.first()
				.evaluate(box => {
					const r = box.getBoundingClientRect();
					return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
				});
		// Left to right, and the three lanes stacked in one column.
		const [discover, design, ui, api, data, testing, ship, operate] = await Promise.all(
			['discover', 'design', 'interface', 'api', 'data', 'test', 'ship', 'operate'].map(centre)
		);
		for (const [a, b] of [[discover, design], [design, api], [api, testing], [testing, ship], [ship, operate]]) expect(a.x).toBeLessThan(b.x);
		expect(ui.x).toBe(api.x);
		expect(data.x).toBe(api.x);
		expect(ui.y).toBeLessThan(api.y);
		expect(api.y).toBeLessThan(data.y);
	});

	test('builds every station from liquid glass', async ({ page }) => {
		await openSection(page);
		const filters = await page
			.locator(`${visibleLine} [data-step] > div:first-child > div:first-child`)
			.evaluateAll(glass => glass.map(element => getComputedStyle(element).backdropFilter));
		expect(filters).toHaveLength(8);
		for (const filter of filters) expect(filter).not.toBe('none');
	});

	test('runs its belts and parcels while in view and stops them once scrolled away', async ({ page }) => {
		await openSection(page);
		const line = page.locator(visibleLine);
		await expect(line).toHaveAttribute('data-moving', 'true');
		await expect(line.locator('[data-parcel]')).toHaveCount(10);
		const animations = await line.locator('[data-belt]').evaluateAll(belts => belts.map(belt => getComputedStyle(belt).animationName));
		expect(animations).toEqual(Array(10).fill('conveyor'));

		await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
		await expect(line).toHaveAttribute('data-moving', 'false');
		expect(await line.locator('> svg').evaluate(svg => (svg as SVGSVGElement).animationsPaused())).toBe(true);
		const stopped = await line.locator('[data-belt]').evaluateAll(belts => belts.map(belt => getComputedStyle(belt).animationName));
		expect(stopped).toEqual(Array(10).fill('none'));
	});

	test('shows a still line under reduced motion', async ({ browser }) => {
		const context = await browser.newContext({ reducedMotion: 'reduce' });
		const page = await context.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await openSection(page);
		const line = page.locator(visibleLine);
		await expect(line.locator('[data-step]').first()).toHaveCSS('opacity', '1');
		await expect(line.locator('[data-parcel]')).toHaveCount(0);
		await expect(line).toHaveAttribute('data-moving', 'false');
		await context.close();
	});

	test('turns the line vertical on phones and keeps the lane labels apart', async ({ browser }) => {
		const phone = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
		const page = await phone.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await openSection(page);
		const line = page.locator(visibleLine);
		await expect(line).toHaveCount(1);
		const box = (await line.boundingBox())!;
		expect(box.height).toBeGreaterThan(box.width * 2);

		const labels = await Promise.all(
			['interface', 'api', 'data'].map(id => line.locator(`[data-step="${id}"] > div:last-child`).boundingBox())
		);
		for (let i = 1; i < labels.length; i++) expect(labels[i - 1]!.x + labels[i - 1]!.width).toBeLessThanOrEqual(labels[i]!.x);
		await expect(line.locator('[data-step="api"]').getByText('Business logic and auth')).toBeHidden();
		await phone.close();
	});
});
