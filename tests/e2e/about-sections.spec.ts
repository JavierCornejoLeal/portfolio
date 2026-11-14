import { expect, test, type Page } from '@playwright/test';

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
		await expect(who).toContainText('I like teaching');
	});

	test('does not lean on coffee anywhere', async ({ page }) => {
		await page.goto('/about');
		await expect(page.locator('main')).not.toContainText(/coffee/i);
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
		for (const word of ['books on history', 'statue', 'video games', 'sport', 'travelling']) await expect(life).toContainText(word);
		await expect(life.getByRole('heading', { level: 3, name: 'Hobbies' })).toBeVisible();
		await expect(life).not.toContainText(/mythology/i);
		// All in: slow to open up, quick to trust, then everything.
		await expect(life).toContainText('take a while to open up');
		await expect(life).toContainText('all in');
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

	test('draws each step number in outline and lights it green under the pointer', async ({ page }) => {
		await page.goto('/about');
		const numbers = page.locator('[data-about-section="process"] [data-step-number]');
		await expect(numbers).toHaveCount(5);
		await expect(numbers.first().locator('text').first()).toHaveText('01');
		// Each number has its own gradient and mask, so the five never borrow one another's.
		const ids = await numbers.evaluateAll(svgs => svgs.flatMap(svg => [...svg.querySelectorAll('[id]')].map(element => element.id)));
		expect(new Set(ids).size).toBe(ids.length);
		const first = numbers.first();
		await expect(first.locator('linearGradient stop')).toHaveCount(0);
		// At rest the outline is already full white; the pointer adds only the green, nothing flashes brighter.
		const outlines = first.locator('text:not([mask])');
		await expect(outlines).toHaveCount(1);
		await expect(outlines).toHaveCSS('stroke', 'rgb(233, 239, 230)');
		await first.scrollIntoViewIfNeeded();
		await first.hover();
		const stops = first.locator('linearGradient stop');
		await expect(stops).not.toHaveCount(0);
		for (const color of await stops.evaluateAll(list => list.map(stop => stop.getAttribute('stop-color')!.toLowerCase())))
			expect(['#abff90', '#5bff2e', '#2fbf1a']).toContain(color);
		// Only the numbers: the step's title and text stay as they are.
		await expect(page.locator('[data-about-section="process"] h3 svg, [data-about-section="process"] p svg')).toHaveCount(0);
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
		// What he did there, not just where.
		// No tool lists under the roles: the Stack section has them.
		await expect(experience.getByText(/Next\.js · React/)).toHaveCount(0);
		const huming = experience.locator('li').filter({ has: page.getByRole('heading', { level: 3, name: 'Huming' }) });
		await expect(huming.locator('ul li').first()).toBeVisible();
		for (const fact of ['ocaive.com', 'GSAP', 'Resend', 'WordPress']) await expect(huming).toContainText(fact);
		const balearia = experience.locator('li').filter({ has: page.getByRole('heading', { level: 3, name: 'Baleària' }) });
		for (const fact of ['Call Center', 'Spring Boot', 'REST']) await expect(balearia).toContainText(fact);
	});

	test('groups the stack', async ({ page }) => {
		await page.goto('/about');
		const stack = page.locator('[data-about-section="stack"]');
		for (const group of ['Frontend', 'Motion & design', 'Backend', 'Data', 'Delivery']) await expect(stack.getByRole('heading', { level: 3, name: group })).toBeVisible();
		for (const item of ['Next.js', 'Spring Boot', 'Supabase', 'Playwright', 'Figma', 'WebGL', 'Motion (Framer Motion)', 'Bootstrap'])
			await expect(stack.getByText(item, { exact: true })).toBeVisible();
	});

	test('answers the questions one at a time, opening and closing smoothly', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/about');
		const faq = page.locator('[data-about-section="faq"]');
		// Found by its place, not its role or text: those queries make Chrome measure the closed answer again, which
		// hid a first open that did not grow at all (the closed answer already reported its full height).
		const open = faq.locator('details').first();
		await open.scrollIntoViewIfNeeded();
		await expect(page.locator('[data-about-section="faq"] astro-island[ssr]')).toHaveCount(0);
		// A visitor reads the question before clicking it: by then the closed answer has been laid out at full height.
		await page.waitForTimeout(500);
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
		// And that is what gets painted. Read at fixed points of the animation, not after a wait: the ease starts fast,
		// so on a slow runner a timed read lands late. Paused at its start the room is empty; a little later it is
		// still well short of the answer.
		const painted = await open.evaluate(details => {
			const body = details.querySelector('[data-faq-body]')!;
			const [animation] = body.getAnimations();
			animation.pause();
			animation.currentTime = 0;
			const start = body.getBoundingClientRect().height;
			animation.currentTime = 40;
			const early = body.getBoundingClientRect().height;
			animation.play();
			return { start, early };
		});
		expect(painted.start).toBeLessThan(1);
		expect(painted.early).toBeLessThan(growth.to * 0.9);
		const answer = open.getByText(/Remote, hybrid, or on site/);
		await expect(open.locator('summary')).toContainText('Are you open to new roles?');
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

test.describe('about life previews', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
	});

	const preview = (page: Page) => page.locator('[data-life-preview]');
	const side = (page: Page, title: string) =>
		page.locator('[data-about-section="life"] article').filter({ has: page.getByRole('heading', { level: 3, name: title }) });

	/** Brings the life section on screen and puts the pointer in the middle of one of its sides. */
	async function hover(page: Page, title: string) {
		// Mounted first: a pointer that moves before the preview hydrates is never seen by it.
		await expect(preview(page)).toBeAttached({ timeout: 15_000 });
		const target = side(page, title);
		await target.scrollIntoViewIfNeeded();
		const box = (await target.boundingBox())!;
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
	}

	test('shows a photo of each side under the pointer, and puts it away when the pointer leaves', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto('/about');
		// It mounts with the page, which a slow runner hydrates late beside the statue's WebGL.
		await expect(preview(page)).toHaveAttribute('data-visible', 'false', { timeout: 15_000 });

		await hover(page, 'Clarinet');
		await expect(preview(page)).toHaveAttribute('data-visible', 'true');
		const current = preview(page).locator('[data-life-photo][data-current]');
		await expect(current.locator('img')).toHaveAttribute('src', '/about/life/clarinet.webp');
		// Wiped open, not faded: it settles fully uncovered and fully opaque.
		await expect.poll(() => current.evaluate(element => getComputedStyle(element).clipPath)).toMatch(/^inset\(0(px|%)?\)$|^none$/);
		await expect(current).toHaveCSS('opacity', '1');
		// Every photo is the same upright rectangle, 3:4, with square corners.
		// Its own size, not its box on screen: the frame leans as it follows the pointer, and a tilted box is larger.
		const frame = () => preview(page).locator('[data-life-frame]').evaluate(element => ({ width: (element as HTMLElement).offsetWidth, height: (element as HTMLElement).offsetHeight }));
		const first = await frame();
		expect(Math.abs(first.width / first.height - 3 / 4)).toBeLessThan(0.02);
		await expect(preview(page).locator('[data-life-frame]')).toHaveCSS('border-radius', '0px');
		await expect(current).toHaveCSS('border-radius', '0px');

		// Another side swaps the photo, in the same frame.
		await hover(page, 'Hobbies');
		await expect(preview(page).locator('[data-life-photo][data-current] img')).toHaveAttribute('src', '/about/life/hobbies.webp');
		expect(await frame()).toEqual(first);

		await page.mouse.move(5, 5);
		await expect(preview(page)).toHaveAttribute('data-visible', 'false');
	});

	test('pairs every photo with its side and keeps it decorative', async ({ page }) => {
		await page.goto('/about');
		for (const [title, file] of [['Triathlon', 'triathlon'], ['Clarinet', 'clarinet'], ['Hobbies', 'hobbies'], ['All in', 'allin']])
			await expect(side(page, title)).toHaveAttribute('data-life-image', `/about/life/${file}.webp`);
		await expect(preview(page)).toHaveAttribute('aria-hidden', 'true', { timeout: 15_000 });
		// The normal cursor stays: the photo sits beside it, it does not replace it.
		await hover(page, 'All in');
		await expect(side(page, 'All in')).not.toHaveCSS('cursor', 'none');
	});

	test('appears at once under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/about');
		await hover(page, 'Hobbies');
		const current = preview(page).locator('[data-life-photo][data-current]');
		await expect(current).toBeVisible();
		expect(await current.evaluate(element => getComputedStyle(element).clipPath)).toMatch(/^inset\(0(px|%)?\)$|^none$/);
	});

	test('stays out of the way on touch screens', async ({ browser }) => {
		const touch = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
		const page = await touch.newPage();
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
		await page.goto('/about');
		await page.locator('[data-about-section="life"]').scrollIntoViewIfNeeded();
		await expect(page.locator('[data-life-preview]')).toHaveCount(0);
		await touch.close();
	});
});
