import { expect, test } from '@playwright/test';

/*
 * The About page after its hero: who, how, where, with what, and the questions people ask.
 */

test.describe('about sections', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
	});

	test('follows the hero with six sections, in order, below the first screen', async ({ page }) => {
		await page.goto('/about');
		const titles = page.locator('main section[data-about-section] h2');
		await expect(titles).toHaveText(['Who I am', 'Off the clock', 'How I work', 'Experience', 'Stack', 'Questions']);
		const top = await page.locator('main section[data-about-section]').first().evaluate(element => element.getBoundingClientRect().top);
		expect(top).toBeGreaterThanOrEqual(page.viewportSize()!.height);
	});

	test('says where he comes from and what he is like', async ({ page }) => {
		await page.goto('/about');
		const who = page.locator('[data-about-section="who"]');
		// No fact list any more: just the words.
		await expect(who.locator('dl')).toHaveCount(0);
		await expect(who).toContainText('Public Works Engineering');
		await expect(who).toContainText('almost anything for a coffee');
	});

	test('has no section numbers and no divider lines', async ({ page }) => {
		await page.goto('/about');
		await expect(page.locator('[data-about-section]').getByText(/^\d{2} \/ \d{2}$/)).toHaveCount(0);
		const lines = await page.locator('[data-about-section]').evaluateAll(sections =>
			sections.flatMap(section => [section, ...section.querySelectorAll('*')]).filter(element => {
				const style = getComputedStyle(element);
				return ['Top', 'Bottom', 'Left', 'Right'].some(side => parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0 && style.getPropertyValue(`border-${side.toLowerCase()}-style`) !== 'none');
			}).length
		);
		expect(lines).toBe(0);
	});

	test('talks about life off the clock: sport, music, curiosity and character', async ({ page }) => {
		await page.goto('/about');
		const life = page.locator('[data-about-section="life"]');
		await expect(life).toContainText('triathlon');
		await expect(life).toContainText('clarinet');
		await expect(life).toContainText('conservatory');
		for (const word of ['History', 'mythology', 'travelling', 'video games']) await expect(life).toContainText(word);
		await expect(life.getByRole('heading', { level: 3, name: 'Hobbies' })).toBeVisible();
		await expect(life).not.toContainText('History & myth');
		await expect(life).toContainText('one coffee');
	});

	test('keeps one title fixed beside the sections, rolling it to each section as it arrives', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/about');
		const rail = page.locator('[data-about-rail]');
		const to = (id: string) =>
			page.locator(`[data-about-section="${id}"]`).evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - innerHeight * 0.25, behavior: 'instant' }));

		await to('who');
		await expect(rail).toHaveAttribute('data-title', 'Who I am');
		await expect(rail).toBeInViewport();

		// Once the sections are under way, it is pinned.
		await to('life');
		await expect(rail).toHaveText('Off the clock');
		const fixedAt = (await rail.boundingBox())!.y;

		await to('process');
		await expect(rail).toHaveAttribute('data-title', 'How I work');
		// It rolls there, letter by letter, then settles on the plain words.
		await expect(rail.locator('[data-swap-word]').first()).toBeAttached();
		await expect(rail).toHaveText('How I work');
		// And it never moved: it stayed put while the sections scrolled past.
		expect(Math.abs((await rail.boundingBox())!.y - fixedAt)).toBeLessThan(2);

		await to('faq');
		await expect(rail).toHaveText('Questions');
		// Each section keeps its own heading for assistive technology.
		await expect(page.locator('[data-about-section="faq"] h2')).toHaveText('Questions');
		// Kept for screen readers only: the rail shows it on screen.
		expect((await page.locator('[data-about-section="faq"] h2').boundingBox())!.width).toBeLessThanOrEqual(1);
	});

	test('shows each section its own title on a phone, where there is no rail', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/about');
		await expect(page.locator('[data-about-rail]')).toBeHidden();
		await expect(page.locator('[data-about-section="process"] h2')).toBeVisible();
	});

	test('numbers the steps of the process', async ({ page }) => {
		await page.goto('/about');
		const steps = page.locator('[data-about-section="process"] ol > li');
		await expect(steps).toHaveCount(5);
		await expect(steps.first()).toContainText('01');
		await expect(steps.first()).toContainText('Ask');
		await expect(steps.last()).toContainText('05');
	});

	test('lists the companies and the studies from the CV', async ({ page }) => {
		await page.goto('/about');
		const experience = page.locator('[data-about-section="experience"]');
		await expect(experience.getByRole('heading', { level: 3, name: 'Huming' })).toBeVisible();
		await expect(experience.getByRole('heading', { level: 3, name: 'Baleària' })).toBeVisible();
		await expect(experience).toContainText('Aug 2025 – Aug 2026');
		await expect(experience).toContainText('Front-end Developer');
		await expect(experience).toContainText('Public Works Engineering');
		await expect(experience).toContainText('Master’s in Cybersecurity');
	});

	test('groups the stack', async ({ page }) => {
		await page.goto('/about');
		const stack = page.locator('[data-about-section="stack"]');
		for (const group of ['Frontend', 'Backend', 'Data', 'Delivery']) await expect(stack.getByRole('heading', { level: 3, name: group })).toBeVisible();
		for (const item of ['Next.js', 'Spring Boot', 'Supabase', 'Playwright']) await expect(stack.getByText(item, { exact: true })).toBeVisible();
	});

	test('answers the questions one at a time, opening and closing smoothly', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/about');
		const faq = page.locator('[data-about-section="faq"]');
		const open = faq.getByRole('group').filter({ hasText: 'Are you open to new roles?' });
		const answer = open.getByText(/Remote, hybrid, or on site/);
		await expect(answer).toBeHidden();
		await open.scrollIntoViewIfNeeded();
		await expect(page.locator('[data-about-section="faq"] astro-island[ssr]')).toHaveCount(0);
		// It grows open rather than jumping: the click starts an eased height animation from nothing to the answer.
		const growth = await open.evaluate(details => {
			details.querySelector('summary')!.click();
			const body = details.querySelector('[data-faq-body]')!;
			const [animation] = body.getAnimations();
			const frames = (animation?.effect as KeyframeEffect | undefined)?.getKeyframes() ?? [];
			const fadeIn = frames.find(frame => frame.opacity !== undefined && Number(frame.opacity) === 0 && Number(frame.offset) > 0);
			return {
				from: parseFloat(String(frames[0]?.height)),
				to: parseFloat(String(frames.at(-1)?.height)),
				duration: Number(animation?.effect?.getTiming().duration),
				textDelay: Number(fadeIn?.offset ?? 0)
			};
		});
		expect(growth.from).toBe(0);
		expect(growth.to).toBeGreaterThan(20);
		// Slow enough to read as smooth, with the text arriving after the room for it.
		expect(growth.duration).toBeGreaterThanOrEqual(700);
		expect(growth.textDelay).toBeGreaterThan(0);
		await expect(answer).toBeVisible();
		await expect(faq.getByText(/freelance/i).first()).toBeVisible();
		await open.locator('summary').click();
		await expect(answer).toBeHidden();
	});

	test('readies the questions with the page, so even the first one opens smoothly', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/about');
		// Ready before anyone scrolls down to them: no first click falls through to the browser's instant toggle.
		await expect(page.locator('[data-about-section="faq"] astro-island[ssr]')).toHaveCount(0, { timeout: 5000 });
		expect(await page.evaluate(() => scrollY)).toBe(0);
	});

	test('rolls the letters of a question on hover, like the footer links', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/about');
		const question = page.locator('[data-about-section="faq"] summary').first();
		await question.scrollIntoViewIfNeeded();
		await expect(page.locator('[data-about-section="faq"] astro-island[ssr]')).toHaveCount(0);
		await expect(question.locator('[data-roll-letter]')).toHaveCount(0);
		await question.hover();
		await expect.poll(() => question.locator('[data-roll-letter]').count()).toBeGreaterThan(10);
		await expect(question).toContainText('Are you open to new roles?');
	});

	test('shows its text as it is, with no reveal on scroll', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/about');
		await expect(page.locator('[data-about-section] [data-reveal]')).toHaveCount(0);
		const lead = page.locator('[data-about-section="who"] p').first();
		await lead.scrollIntoViewIfNeeded();
		await expect(lead).toHaveCSS('opacity', '1');
		await expect(lead).toHaveCSS('transform', 'none');
	});

	test('tells who he is in paragraphs, one after another, not side by side', async ({ page }) => {
		await page.goto('/about');
		const paragraphs = page.locator('[data-about-section="who"] [data-who-text] p');
		await expect(paragraphs).toHaveCount(2);
		const [first, second] = [await paragraphs.nth(0).boundingBox(), await paragraphs.nth(1).boundingBox()];
		expect(Math.abs(first!.x - second!.x)).toBeLessThan(1);
		expect(second!.y).toBeGreaterThan(first!.y + first!.height - 1);
		// As wide as the opening line above them, not half of it.
		const lead = (await page.locator('[data-about-section="who"] > div > p').first().boundingBox())!;
		expect(Math.abs(first!.width - lead.width)).toBeLessThan(2);
	});

	test('fills "the things people actually touch" with green lines that drift', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/about');
		const phrase = page.locator('[data-about-section="who"] [data-canvas-text]');
		await expect(phrase).toHaveText('the things people actually touch');
		await expect(phrase).toHaveCSS('color', 'rgba(0, 0, 0, 0)');
		await expect(phrase).toHaveCSS('background-clip', /^text(, text)*$/);
		await expect(phrase).toHaveCSS('background-image', /url\("data:image\/svg\+xml/);
		await expect(phrase).not.toHaveCSS('animation-name', 'none');
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await expect(phrase).toHaveCSS('animation-name', 'none');
	});
});
