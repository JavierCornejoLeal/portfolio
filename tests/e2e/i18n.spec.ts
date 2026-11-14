import { expect, test, type Page } from '@playwright/test';

/*
 * Languages: English at the root, Spanish under /es. An EN/ES switch beside the menu leads to the same page in the
 * other language, every link to another page of the site keeps the visitor in the language they are reading, and
 * every word on a Spanish page is Spanish.
 */

const SITE = 'https://javiercornejo.vercel.app';

const switcher = (page: Page) => page.getByRole('navigation', { name: /^(Language|Idioma)$/ });
const menuButton = (page: Page) => page.getByRole('button', { name: /^(Open menu|Close menu|Abrir menú|Cerrar menú)$/ });
const menu = (page: Page) => page.getByRole('navigation', { name: /^(Main|Principal)$/ });

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
		test(`serves ${en} in English and ${es} in Spanish`, async ({ page }) => {
			const english = await page.goto(en);
			expect(english?.status()).toBe(200);
			await expect(page.locator('html')).toHaveAttribute('lang', 'en');
			await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US');

			const spanish = await page.goto(es);
			expect(spanish?.status()).toBe(200);
			await expect(page.locator('html')).toHaveAttribute('lang', 'es');
			await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'es_ES');
		});
	}

	test('indexes the Spanish home, with each language pointing at the other', async ({ page }) => {
		const alternates = () =>
			page.locator('link[rel="alternate"][hreflang]').evaluateAll((links) =>
				links.map((link) => [link.getAttribute('hreflang'), link.getAttribute('href')])
			);
		const expected = [
			['en', `${SITE}/`],
			['es', `${SITE}/es/`],
			['x-default', `${SITE}/`]
		];

		await page.goto('/es/');
		await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/es/`);
		await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /desarrollador full stack/);
		expect(await alternates()).toEqual(expected);

		await page.goto('/');
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/`);
		expect(await alternates()).toEqual(expected);
	});

	test('keeps the Spanish About and project pages out of search, like the English ones', async ({ page }) => {
		for (const path of ['/es/about', '/es/projects/ocaive']) {
			await page.goto(path);
			await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
			await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
		}
	});

	test('lists both homes in the sitemap, each with its alternates', async ({ request }) => {
		const sitemap = await (await request.get('/sitemap-0.xml')).text();
		expect(sitemap).toContain(`<loc>${SITE}/</loc>`);
		expect(sitemap).toContain(`<loc>${SITE}/es/</loc>`);
		expect(sitemap).toContain(`<xhtml:link rel="alternate" hreflang="es" href="${SITE}/es/"/>`);
		expect(sitemap).not.toContain('/es/about');
		expect(sitemap).not.toContain('/es/projects/');
	});

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

		await page.goto('/es/');
		await expect(page.getByRole('navigation', { name: 'Idioma' })).toBeVisible();
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
		await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeVisible();
		await menuButton(page).click();
		await expect(page.getByRole('button', { name: 'Cerrar menú' })).toBeVisible();
		const nav = page.getByRole('navigation', { name: 'Principal' });
		await expect(nav.getByRole('link', { name: 'Sobre mí', exact: true })).toHaveAttribute('href', '/es/about');
		await expect(nav.getByRole('link', { name: 'Proyectos', exact: true })).toHaveAttribute('href', '#projects');
		await expect(nav.getByRole('link', { name: 'Contacto', exact: true })).toHaveAttribute('href', '#contact-inside');
		await expect(nav.getByRole('link', { name: 'Inicio', exact: true })).toHaveCount(0);
		await expect(nav.getByRole('link', { name: /^GitHub/ })).toHaveAccessibleName('GitHub (se abre en una pestaña nueva)');

		await page.goto('/es/about');
		await menuButton(page).click();
		await expect(menu(page).getByRole('link', { name: 'Inicio', exact: true })).toHaveAttribute('href', '/es/');
		await expect(menu(page).getByRole('link', { name: 'Proyectos', exact: true })).toHaveAttribute('href', '/es/#projects');
		await expect(menu(page).getByRole('link', { name: 'Sobre mí', exact: true })).toHaveAttribute('href', '/es/about');
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

	test('speaks Spanish on the Spanish home', async ({ page }) => {
		await page.goto('/es/');
		await expect(page.getByText('Código que se ve por dentro: cuidado en la superficie, sólido hasta el fondo.')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Ver proyectos' })).toBeVisible();
		await expect(page.getByRole('heading', { level: 2, name: 'Construyo mundos' })).toBeAttached();
		await expect(page.getByText('Si tienes algo que merece la pena construir, construyámoslo bien.')).toBeAttached();
		await expect(page.getByRole('group', { name: 'Proyectos' })).toBeAttached();
		await expect(page.getByText('Arrastra o desliza para explorar')).toBeAttached();
		await expect(page.getByRole('link', { name: 'Abrir ÒCAIVE' }).first()).toBeAttached();
		// None of the English words are left.
		for (const english of ['Discover works', 'I build', 'Featured projects', 'Drag or swipe to explore']) {
			await expect(page.getByText(english, { exact: true })).toHaveCount(0);
		}

		// The contact letter reads HOLA, and its footer is Spanish too.
		const footer = page.getByRole('contentinfo');
		await page.locator('#contact').scrollIntoViewIfNeeded();
		await expect(page.getByText('¿Tienes algo que merezca la pena construir?')).toBeAttached({ timeout: 15_000 });
		await expect(page.getByRole('link', { name: 'Hablemos' })).toBeAttached();
		await expect(footer).toContainText('Construyamos');
		await expect(footer.getByRole('link', { name: /^Escríbeme un email/ })).toHaveAttribute('href', /^mailto:/);
		await expect(footer.getByRole('list', { name: 'En otros sitios' })).toBeAttached();
		await expect(footer.getByRole('navigation', { name: 'Pie de página' }).getByRole('link', { name: 'Volver arriba' })).toBeAttached();
		await expect(footer).toContainText('desarrollador full creative');
	});

	for (const path of ['/', '/es/']) {
		test(`fits the statement on ${path} between the controls and the foot of a small phone`, async ({ page }) => {
			await page.setViewportSize({ width: 360, height: 640 });
			await page.goto(path);
			await page.locator('[data-statement]').evaluate((section) => scrollTo(0, (section as HTMLElement).offsetTop + 50));
			const layout = await page.evaluate(() => {
				// The title's words, not its full-width box: they must stay clear of the controls' row.
				const range = document.createRange();
				range.selectNodeContents(document.querySelector('#statement-title')!);
				const words = [...range.getClientRects()];
				const controls = document.querySelector('nav[aria-label="Language"], nav[aria-label="Idioma"]')!.getBoundingClientRect();
				const last = [...document.querySelectorAll('[data-statement] p')].at(-1)!.getBoundingClientRect();
				return {
					clash: words.some((word) => word.top < controls.bottom && word.right > controls.left),
					lastBottom: last.bottom,
					height: innerHeight
				};
			});
			expect(layout.clash).toBe(false);
			expect(layout.lastBottom).toBeLessThanOrEqual(layout.height);
		});
	}

	test('speaks Spanish on the Spanish About page', async ({ page }) => {
		await page.goto('/es/about');
		await expect(page).toHaveTitle('Sobre mí · Javier Cornejo');
		await expect(page.getByRole('heading', { level: 1, name: 'Sobre mí' })).toBeVisible();
		for (const section of ['Quién soy', 'Fuera del trabajo', 'Cómo trabajo', 'Experiencia', 'Stack', 'Preguntas']) {
			await expect(page.getByRole('heading', { level: 2, name: section, exact: true })).toBeAttached();
		}
		await expect(page.getByText('las cosas que la gente toca de verdad')).toBeAttached();
		await expect(page.getByRole('heading', { level: 3, name: 'Triatlón' })).toBeAttached();
		await expect(page.getByRole('heading', { level: 3, name: 'Desmontar' })).toBeAttached();
		await expect(page.getByText('Desarrollador Front-end')).toBeAttached();
		await expect(page.getByText('Antes y en paralelo')).toBeAttached();
		await expect(page.getByText('Motion y diseño')).toBeAttached();
		await expect(page.getByText('¿Cómo contacto contigo?').first()).toBeAttached();
		for (const english of ['Who I am', 'Off the clock', 'Triathlon', 'Before and alongside']) {
			await expect(page.getByText(english, { exact: true })).toHaveCount(0);
		}

		const footer = page.getByRole('contentinfo');
		await footer.scrollIntoViewIfNeeded();
		await expect(footer.getByRole('navigation', { name: 'Pie de página' }).getByRole('link', { name: 'Proyectos' })).toHaveAttribute(
			'href',
			'/es/#projects'
		);
	});

	test('speaks Spanish on a Spanish project page', async ({ page }) => {
		await page.goto('/es/projects/crm-eduardo');
		await expect(page.getByRole('heading', { level: 2, name: 'Sobre CRM Eduardo' })).toBeAttached();
		for (const label of ['Rol', 'Stack', 'Web']) await expect(page.getByText(label, { exact: true }).first()).toBeAttached();
		await expect(page.getByText('Herramienta privada')).toBeAttached();
		await expect(page.getByRole('heading', { level: 2, name: 'Por qué este stack' })).toBeAttached();
		await expect(page.getByRole('heading', { level: 2, name: 'Curiosidades' })).toBeAttached();
		await expect(page.getByText(/^La cara privada de eduardocalabuig\.com/)).toBeAttached();
		await expect(page.getByRole('link', { name: 'Ver Portfolio' })).toHaveAttribute('href', '/es/projects/portfolio');
		for (const english of ['Why this stack', 'Curiosities', 'Private tool']) {
			await expect(page.getByText(english, { exact: true })).toHaveCount(0);
		}
	});

	test('tells the same stories in both languages, with the same pictures', async ({ page }) => {
		for (const slug of ['eduardo-calabuig', 'ocaive', 'hub-cultural-cabanyal', 'crm-eduardo', 'portfolio']) {
			const media = async (path: string) => {
				await page.goto(path);
				return page.locator('[data-project-story] img, [data-project-story] video').evaluateAll((items) =>
					items.map((item) => item.getAttribute('src'))
				);
			};
			expect(await media(`/es/projects/${slug}`)).toEqual(await media(`/projects/${slug}`));
		}
	});
});
