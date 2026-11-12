import { expect, test } from '@playwright/test';

/*
 * The About page after its hero: who, how, where, with what, and the questions people ask.
 */

test.describe('about sections', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => sessionStorage.setItem('loader-seen', '1'));
	});

	test('follows the hero with five sections, in order, below the first screen', async ({ page }) => {
		await page.goto('/about');
		const titles = page.locator('main section[data-about-section] h2');
		await expect(titles).toHaveText(['Who I am', 'How I work', 'Experience', 'Stack', 'Questions']);
		const top = await page.locator('main section[data-about-section]').first().evaluate(element => element.getBoundingClientRect().top);
		expect(top).toBeGreaterThanOrEqual(page.viewportSize()!.height);
	});

	test('says where he comes from and what he is like', async ({ page }) => {
		await page.goto('/about');
		const who = page.locator('[data-about-section="who"]');
		for (const [label, value] of [['Born', 'Dénia'], ['Roots', 'La Mancha'], ['Runs on', 'Coffee']]) {
			await expect(who.locator('dt', { hasText: label })).toHaveCount(1);
			await expect(who.locator('dd', { hasText: value })).toHaveCount(1);
		}
		await expect(who).toContainText('Public Works Engineering');
		await expect(who).toContainText('almost anything for a coffee');
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

	test('answers the questions one at a time, opened on demand', async ({ page }) => {
		await page.goto('/about');
		const faq = page.locator('[data-about-section="faq"]');
		const open = faq.getByRole('group').filter({ hasText: 'Are you open to new roles?' });
		const answer = open.getByText(/Remote, hybrid, or on site/);
		await expect(answer).toBeHidden();
		await open.getByText('Are you open to new roles?').click();
		await expect(answer).toBeVisible();
		await expect(faq.getByText(/freelance/i).first()).toBeVisible();
		await open.getByText('Are you open to new roles?').click();
		await expect(answer).toBeHidden();
	});

	test('shows every section still under reduced motion', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/about');
		const blocks = page.locator('[data-about-section] [data-reveal]');
		expect(await blocks.count()).toBeGreaterThan(0);
		for (const block of await blocks.all()) {
			await expect(block).toHaveCSS('opacity', '1');
		}
	});
});
