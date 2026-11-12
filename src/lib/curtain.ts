/*
 * Page curtain: before leaving for another page (a project, About), black columns rise up the screen in a staircase
 * until they cover it, then the next page loads, covered by the same columns, which draw back up to reveal it
 * (Layout.astro, .page-curtain-in in global.css). Straight there under reduced motion.
 * Styles: .page-curtain in global.css.
 */

const COLUMNS = 6
/** The last column's delay plus its rise (global.css), and a margin, as a fallback if animationend never comes. */
const FALLBACK_MS = (COLUMNS - 1) * 70 + 550 + 400

export function leaveTo(href: string) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.location.assign(href)
    return
  }
  if (document.querySelector("[data-curtain]")) return
  const curtain = document.createElement("div")
  curtain.dataset.curtain = ""
  curtain.className = "page-curtain"
  curtain.setAttribute("aria-hidden", "true")
  curtain.style.setProperty("--columns", String(COLUMNS))
  for (let i = 0; i < COLUMNS; i++) {
    const column = document.createElement("span")
    column.style.setProperty("--i", String(i))
    curtain.append(column)
  }
  document.body.append(curtain)

  let left = false
  const go = () => {
    if (left) return
    left = true
    // Tell the page it lands on to open the curtain again (Layout.astro reads it before painting).
    try {
      sessionStorage.setItem("curtain-in", "1")
    } catch {
      /* No storage: the page simply shows without the reveal. */
    }
    window.location.assign(href)
  }
  // The leftmost column rises last.
  curtain.firstElementChild!.addEventListener("animationend", go, { once: true })
  window.setTimeout(go, FALLBACK_MS)
}

/** Whether a link leads to another page of this site (a project, About, or home from them): not this page. */
export function opensWithCurtain(link: HTMLAnchorElement) {
  if (link.target && link.target !== "_self") return false
  if (link.hasAttribute("download")) return false
  const url = new URL(link.href, window.location.href)
  return url.origin === window.location.origin && url.pathname !== window.location.pathname
}

// Back or Forward can restore this page from the browser's cache, with the curtain that left still drawn: take it
// down, and open the black curtain over the page instead, as on any arrival. (A page that reloads on Back starts
// covered from Layout.astro's head.) Guarded: the module is also imported while the page renders on the server.
if (typeof window !== "undefined") {
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return
    document.querySelectorAll("[data-curtain]").forEach((element) => element.remove())
    const root = document.documentElement
    root.classList.remove("curtain-in", "curtain-hold")
    // Reflow, so the reveal starts over rather than staying in its finished state.
    void root.offsetWidth
    root.classList.add("curtain-in")
  })
}
