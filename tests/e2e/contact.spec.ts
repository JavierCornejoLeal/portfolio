import { expect, test, type Page } from '@playwright/test';

const portal = '[data-contact] section';

/** Scrolls to the contact section and waits for the portal to measure its type. */
async function openSection(page: Page) {
	await page.goto('/');
	await page.locator('[data-contact]').evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
	await expect(page.locator(portal)).toHaveAttribute('data-gp-ready', 'true', { timeout: 15_000 });
}

/** Scroll position at a share of the portal's travel. */
async function scrollThrough(page: Page, share: number) {
	await page.locator(portal).evaluate((section, share) => {
		const top = section.getBoundingClientRect().top + scrollY;
		const travel = (section as HTMLElement).offsetHeight - innerHeight;
		window.scrollTo({ top: top + travel * share, behavior: 'instant' });
	}, share);
}

/** Colour of the pixel at the centre of the screen. */
async function centrePixel(page: Page) {
	const png = await page.screenshot();
	return page.evaluate(async b64 => {
		const image = new Image();
		image.src = `data:image/png;base64,${b64}`;
		await image.decode();
		const canvas = document.createElement('canvas');
		canvas.width = image.width;
		canvas.height = image.height;
		const context = canvas.getContext('2d')!;
		context.drawImage(image, 0, 0);
		const [r, g, b] = context.getImageData(image.width >> 1, image.height >> 1, 1, 1).data;
		return { r, g, b };
	}, png.toString('base64'));
}

test.describe('contact portal', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
	});

	test('follows the projects with a quiet HELLO, a line above it and a glass Let\'s talk below', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await openSection(page);

		const follows = await page.evaluate(() => {
			const projects = document.querySelector('[data-projects]')!;
			const contact = document.querySelector('[data-contact]')!;
			return Boolean(projects.compareDocumentPosition(contact) & Node.DOCUMENT_POSITION_FOLLOWING);
		});
		expect(follows).toBe(true);
		await expect(page.locator('#contact')).toHaveCount(1);
		await expect(page.locator(portal)).toHaveAccessibleName('HELLO');
		await expect(page.locator(portal)).toHaveAttribute('data-gp-motion', 'on');

		const eyebrow = page.getByText('Got something worth building?');
		const talk = page.locator('[data-contact]').getByRole('link', { name: "Let's talk" });
		await expect(eyebrow).toBeVisible();
		await expect(talk).toBeVisible();
		await expect(talk).toHaveAttribute('href', '#contact-inside');
		// The button is liquid glass that bends what sits behind it.
		await expect(talk.locator('[data-refract]')).toHaveCount(1);
		// It speaks in the site's reading face, not the portal's Arial default.
		await expect(talk).toHaveCSS('font-family', /DM Sans/);

		// The line sits above the word and the button below it.
		const top = await page.locator(portal).evaluate(section => parseFloat(getComputedStyle(section).getPropertyValue('--gp-word-top')));
		const bottom = await page.locator(portal).evaluate(section => parseFloat(getComputedStyle(section).getPropertyValue('--gp-word-bottom')));
		const pinTop = (await page.locator(`${portal} [data-gp-pin]`).boundingBox())!.y;
		const eyebrowBox = (await eyebrow.boundingBox())!;
		const talkBox = (await talk.boundingBox())!;
		expect(eyebrowBox.y + eyebrowBox.height).toBeLessThanOrEqual(pinTop + top);
		expect(talkBox.y).toBeGreaterThanOrEqual(pinTop + bottom);
	});

	test('zooms through a letter of HELLO until a near-black green fills the screen', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await openSection(page);

		// At rest the word is a window onto the green; the page shows around it.
		await scrollThrough(page, 0);
		await expect(page.locator(portal)).toHaveAttribute('data-gp-progress', '0.00000');
		await expect(page.locator(`${portal} [data-gp-field]`)).toHaveCSS('clip-path', /url/);

		// Halfway the camera is on its way in, scaled well past the opening frame.
		await scrollThrough(page, 0.5);
		await expect.poll(async () => Number(await page.locator(portal).getAttribute('data-gp-progress'))).toBeGreaterThan(0.3);

		// At the end the field is unclipped and the screen is a near-black green: green leads, but barely lit.
		await scrollThrough(page, 1);
		await expect(page.locator(portal)).toHaveAttribute('data-gp-entered', 'true');
		await expect(page.locator(`${portal} [data-gp-field]`)).toHaveCSS('clip-path', 'none');
		const { r, g, b } = await centrePixel(page);
		expect(g).toBeGreaterThan(r + 8);
		expect(g).toBeGreaterThan(b + 8);
		expect(g).toBeLessThan(50);
	});

	test('takes Let\'s talk into the green, where the footer will live', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await openSection(page);

		await page.locator('[data-contact]').getByRole('link', { name: "Let's talk" }).click();
		await expect(page).toHaveURL(/#contact-inside$/);
		await expect(page.locator(portal)).toHaveAttribute('data-gp-entered', 'true', { timeout: 10_000 });
	});

	test('lands the menu\'s Contact link on the section', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Contact', exact: true }).click();
		await expect
			.poll(() => page.locator('#contact').evaluate(element => Math.round(element.getBoundingClientRect().top)))
			.toBe(0);
	});

	test('stays still and fully readable under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await openSection(page);

		await expect(page.locator(portal)).toHaveAttribute('data-gp-motion', 'off');
		await expect(page.getByText('Got something worth building?')).toBeVisible();
		await expect(page.locator('[data-contact]').getByRole('link', { name: "Let's talk" })).toBeVisible();
	});
});
