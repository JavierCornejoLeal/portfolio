import { expect, type Page } from '@playwright/test';

/**
 * Waits until the menu is open and has finished spreading: its panel uncovered and its links in place. Until then a
 * link's point can still be clipped off, and a click there lands on the panel itself, so it neither closes the menu
 * nor follows the link. A slow CI runner can take well past the transition's own second to get there.
 */
export async function settleMenu(page: Page) {
	await expect
		.poll(
			() =>
				page.locator('#site-menu').evaluate(
					(nav) => nav.hasAttribute('data-open') && nav.getAnimations({ subtree: true }).every((animation) => animation.playState !== 'running')
				),
			{ timeout: 10_000 }
		)
		.toBe(true);
}
