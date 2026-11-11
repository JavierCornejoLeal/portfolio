import { expect, test, type Page } from '@playwright/test';

const visibleLine = '[data-process-line]:visible';

async function openSection(page: Page) {
	await page.goto('/');
	await page.locator('[data-process]').evaluate(section => window.scrollTo({ top: section.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
	// The section hydrates on arrival (client:visible): Astro drops the island's `ssr` attribute once it has.
	// A loaded CI runner can take a while, so this wait is generous and every later one can stay short.
	await expect(page.locator('astro-island:has([data-process])')).not.toHaveAttribute('ssr', /.*/, { timeout: 15_000 });
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
			'Like a production line: tools chosen to work well together, and every stage hands over something you can test before the next one starts.'
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
			'02 Design: Stack, architecture and UI',
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

	test('draws each link as a solid hairline with one short stroke travelling along it, no dots or parcels', async ({ page }) => {
		await openSection(page);
		const line = page.locator(visibleLine);
		await expect(line.locator('[data-parcel]')).toHaveCount(0);
		// Each link draws itself in, then stays one continuous stroke: its dash covers the whole normalised length
		// (pathLength 1), so there are no dots along it.
		const links = line.locator('[data-link]');
		await expect(links).toHaveCount(10);
		// Generous wait: it spans hydration on arrival plus the staggered draw-in, slow on a loaded CI runner.
		// Each entry reads "<dash> of <length>", so a failure shows what was actually drawn.
		await expect
			.poll(
				() =>
					links.evaluateAll(paths =>
						paths.map(path => {
							const total = Number(path.getAttribute('pathLength') ?? (path as SVGPathElement).getTotalLength());
							const dasharray = getComputedStyle(path).strokeDasharray;
							const dash = dasharray === 'none' ? total : parseFloat(dasharray);
							return dash >= total ? 'solid' : `${dash} of ${total}`;
						})
					),
				{ timeout: 15_000 }
			)
			.toEqual(Array(10).fill('solid'));

		// One short stroke per link: a single dash, far shorter than the link it rides.
		await expect(line).toHaveAttribute('data-moving', 'true');
		const pulses = await line.locator('[data-pulse]').evaluateAll(paths =>
			paths.map(path => {
				const style = getComputedStyle(path);
				const [dash] = style.strokeDasharray.split(',').map(parseFloat);
				return { animation: style.animationName, dash, length: (path as SVGPathElement).getTotalLength() };
			})
		);
		expect(pulses).toHaveLength(10);
		for (const pulse of pulses) {
			expect(pulse.animation).toBe('process-pulse');
			expect(pulse.dash).toBeLessThan(pulse.length / 4);
		}
	});

	test('stops the travelling strokes once scrolled away', async ({ page }) => {
		await openSection(page);
		const line = page.locator(visibleLine);
		await expect(line).toHaveAttribute('data-moving', 'true');
		await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
		await expect(line).toHaveAttribute('data-moving', 'false');
		const stopped = await line.locator('[data-pulse]').evaluateAll(paths => paths.map(path => getComputedStyle(path).animationName));
		expect(stopped).toEqual(Array(10).fill('none'));
	});

	test('shows a still line under reduced motion', async ({ browser }) => {
		const context = await browser.newContext({ reducedMotion: 'reduce' });
		const page = await context.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await openSection(page);
		const line = page.locator(visibleLine);
		await expect(line.locator('[data-step]').first()).toHaveCSS('opacity', '1');
		await expect(line).toHaveAttribute('data-moving', 'false');
		const pulses = await line.locator('[data-pulse]').evaluateAll(paths => paths.map(path => getComputedStyle(path).animationName));
		expect(pulses.every(name => name === 'none')).toBe(true);
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
