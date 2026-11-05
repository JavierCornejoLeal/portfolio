import { expect, test } from '@playwright/test';

const SITE = 'https://javiercornejo.vercel.app';

test.describe('SEO', () => {
	test('home exposes title, description, canonical and social cards', async ({ page }) => {
		await page.goto('/');

		await expect(page).toHaveTitle('Javier Cornejo');
		const meta = (selector: string) => page.locator(selector).getAttribute('content');
		expect(await meta('meta[name="description"]')).toContain('Javier Cornejo, full stack developer');
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/`);
		expect(await meta('meta[property="og:title"]')).toBe('Javier Cornejo');
		expect(await meta('meta[property="og:url"]')).toBe(`${SITE}/`);
		expect(await meta('meta[property="og:image"]')).toBe(`${SITE}/og-image.png`);
		expect(await meta('meta[name="twitter:card"]')).toBe('summary_large_image');
		await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
	});

	test('home describes Javier as a Person with his social profiles', async ({ page }) => {
		await page.goto('/');

		const json = await page.locator('script[type="application/ld+json"]').textContent();
		const person = JSON.parse(json ?? '{}');
		expect(person['@type']).toBe('Person');
		expect(person.name).toBe('Javier Cornejo');
		expect(person.sameAs).toEqual([
			'https://www.instagram.com/javiiicornejo/',
			'https://www.linkedin.com/in/cornejolealjavier/',
			'https://github.com/JavierCornejoLeal'
		]);
	});

	test('serves the favicon set, manifest and social image', async ({ page, request }) => {
		await page.goto('/');

		const hrefs = await page
			.locator('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]')
			.evaluateAll(links => links.map(link => link.getAttribute('href')!));
		expect(hrefs).toEqual(['/favicon.ico', '/favicon-32x32.png', '/apple-touch-icon.png', '/site.webmanifest']);
		for (const path of [...hrefs, '/icon-192.png', '/icon-512.png', '/og-image.png']) {
			const response = await request.get(path);
			expect(response.status(), path).toBe(200);
		}
	});

	test('lets crawlers in and points them at a sitemap that lists the home only', async ({ request }) => {
		const robots = await (await request.get('/robots.txt')).text();
		expect(robots).toContain('Allow: /');
		expect(robots).toContain(`Sitemap: ${SITE}/sitemap-index.xml`);

		const index = await request.get('/sitemap-index.xml');
		expect(index.status()).toBe(200);
		const sitemap = await (await request.get('/sitemap-0.xml')).text();
		expect(sitemap).toContain(`<loc>${SITE}/</loc>`);
		expect(sitemap).not.toContain('404');
	});

	test('keeps the 404 page out of search results', async ({ page }) => {
		await page.goto('/this-route-does-not-exist');

		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
		await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
		await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
	});
});
