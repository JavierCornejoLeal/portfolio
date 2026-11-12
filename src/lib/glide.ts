/*
 * Gliding to a section of the home page. The smooth scroll itself is the page's CSS (scroll-behavior), so reduced
 * motion still jumps. Shared by in-page links (Layout.astro), the menu and arrivals from other pages.
 */

/** Sections whose content mounts on approach: head for the section that mounts it, and the target appears. */
const VIA: Record<string, string> = {
  // The footer lives in the contact portal, which mounts on approach.
  "#contact-inside": "#contact",
}

/** Scrolls a section into view: by its start, or by its end when it asks to be shown whole (the footer). */
export function scrollToTarget(target: Element, behavior: ScrollBehavior = "auto") {
  target.scrollIntoView({ behavior, block: (target as HTMLElement).dataset.scrollAlign === "end" ? "end" : "start" })
}

/**
 * Glides to `hash` (#projects, #contact-inside…). When the target has not mounted yet, glides towards the section
 * that mounts it, then on to the target once it has appeared and its place in the page has held for a few frames,
 * as one continuous scroll. Returns whether it is handling the way there.
 *
 * `instant` jumps instead of gliding (behind the page curtain, arriving from another page); `onArrive` runs once the
 * target is in place.
 */
export function glideTo(hash: string, { instant = false, onArrive }: { instant?: boolean; onArrive?: () => void } = {}): boolean {
  const behavior: ScrollBehavior = instant ? "instant" : "auto"
  const target = document.querySelector(hash)
  if (target) {
    scrollToTarget(target, behavior)
    if (onArrive) requestAnimationFrame(onArrive)
    return true
  }
  const via = VIA[hash] ? document.querySelector(VIA[hash]) : null
  if (!via) return false
  via.scrollIntoView({ behavior })
  const started = performance.now()
  let last = Number.NaN
  let still = 0
  const arrive = () => {
    const found = document.querySelector(hash)
    if (found) {
      const top = found.getBoundingClientRect().top + window.scrollY
      still = Math.abs(top - last) < 1 ? still + 1 : 0
      last = top
      if (still >= 3) {
        scrollToTarget(found, behavior)
        if (onArrive) requestAnimationFrame(onArrive)
        return
      }
    }
    if (performance.now() - started < 8000) requestAnimationFrame(arrive)
  }
  requestAnimationFrame(arrive)
  return true
}
