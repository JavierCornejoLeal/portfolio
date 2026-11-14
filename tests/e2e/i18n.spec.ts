import { expect, test, type Page } from '@playwright/test';

/*
 * Languages: English at the root, Spanish under /es. An EN/ES switch beside the menu leads to the same page in the
 * other language, and every link to another page of the site keeps the visitor in the language they are reading.
 */

const switcher = (page: Page) => page.getByRole('navigation', { name: 'Language' });
const menuButton = (page: Page) => page.getByRole('button', { name: /^(Open|Close) menu$/ });
const menu = (page: Page) => page.getByRole('navigation', { name: 'Main' });

const PAGES = [
	{ en: '/', es: '/es/' },
	{ en: '/about', es: '/es/about' },
	{ en: '/projects/ocaive', es: '/es/projects/ocaive' }
];

test.describe('languages', () => {
	// The first-visit loader covers home's controls (and keeps them out of the accessibility tree) until it lifts.
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
	});

	for (const { en, es } of PAGES) {
		test(`serves ${en} in English and ${es} in Spanish, the Spanish one kept out of search`, async ({ page }) => {
			const english = await page.goto(en);
			expect(english?.status()).toBe(200);
			await expect(page.locator('html')).toHaveAttribute('lang', 'en');
			await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US');

			const spanish = await page.goto(es);
			expect(spanish?.status()).toBe(200);
			await expect(page.locator('html')).toHaveAttribute('lang', 'es');
			await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'es_ES');
			// Its copy is still English until it is translated: no canonical, no Person, noindex.
			await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
			await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
			await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
		});
	}

	test('shows EN and ES beside the menu, the language being read filled in', async ({ page }) => {
		await page.goto('/');
		const nav = switcher(page);
		await expect(nav).toBeVisible();
		await expect(nav.getByText('EN', { exact: true })).toBeVisible();
		await expect(nav.getByText('ES', { exact: true })).toBeVisible();
		// English is current (no link); Spanish is the way there.
		await expect(nav.locator('[aria-current="true"]')).toHaveText('ENEnglish');
		await expect(nav.getByRole('link')).toHaveCount(1);
		await expect(nav.getByRole('link', { name: 'Español' })).toHaveAttribute('href', '/es/');
		await expect(nav.getByRole('link', { name: 'Español' })).toHaveAttribute('hreflang', 'es');

		// Same row as the menu button, just to its left.
		const switchBox = (await nav.boundingBox())!;
		const buttonBox = (await menuButton(page).boundingBox())!;
		expect(switchBox.x + switchBox.width).toBeLessThanOrEqual(buttonBox.x);
		expect(Math.abs(switchBox.y + switchBox.height / 2 - (buttonBox.y + buttonBox.height / 2))).toBeLessThan(2);
	});

	for (const { en, es } of PAGES) {
		test(`switches ${en} to ${es} and back`, async ({ page }) => {
			await page.goto(en);
			await switcher(page).getByRole('link', { name: 'Español' }).click();
			await expect(page).toHaveURL(new RegExp(`${es.replace(/\/$/, '')}/?$`));
			await expect(page.locator('html')).toHaveAttribute('lang', 'es');
			await expect(switcher(page).locator('[aria-current="true"]')).toHaveText('ESEspañol');

			await switcher(page).getByRole('link', { name: 'English' }).click();
			await expect(page).toHaveURL(new RegExp(`${en === '/' ? '' : en}/?$`));
			await expect(page.locator('html')).toHaveAttribute('lang', 'en');
		});
	}

	test('keeps the menu in Spanish on Spanish pages', async ({ page }) => {
		await page.goto('/es/');
		await menuButton(page).click();
		await expect(menu(page).getByRole('link', { name: 'About', exact: true })).toHaveAttribute('href', '/es/about');
		await expect(menu(page).getByRole('link', { name: 'Home', exact: true })).toHaveCount(0);

		await page.goto('/es/about');
		await menuButton(page).click();
		await expect(menu(page).getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('href', '/es/');
		await expect(menu(page).getByRole('link', { name: 'Projects', exact: true })).toHaveAttribute('href', '/es/#projects');
		await expect(menu(page).getByRole('link', { name: 'About', exact: true })).toHaveAttribute('href', '/es/about');
	});

	test('keeps project links in Spanish on Spanish pages', async ({ page }) => {
		// The language switch's English link is the one way back to /projects/…
		await page.goto('/es/');
		await expect(page.locator('a[href^="/es/projects/"]').first()).toBeAttached();
		await expect(page.locator('a[href^="/projects/"]:not([hreflang])')).toHaveCount(0);

		await page.goto('/es/projects/ocaive');
		await expect(page.locator('a[href^="/es/projects/"]').first()).toBeAttached();
		await expect(page.locator('a[href^="/projects/"]:not([hreflang])')).toHaveCount(0);
	});

	test('leads the footer back to the Spanish home', async ({ page }) => {
		await page.goto('/es/about');
		const footer = page.getByRole('contentinfo');
		await footer.scrollIntoViewIfNeeded();
		await expect(footer.getByRole('navigation', { name: 'Footer' }).getByRole('link', { name: 'Projects' })).toHaveAttribute(
			'href',
			'/es/#projects'
		);
	});

	test('keeps the Spanish pages out of the sitemap', async ({ request }) => {
		const sitemap = await (await request.get('/sitemap-0.xml')).text();
		expect(sitemap).toContain('<loc>https://javiercornejo.vercel.app/</loc>');
		expect(sitemap).not.toContain('/es/');
	});
});
