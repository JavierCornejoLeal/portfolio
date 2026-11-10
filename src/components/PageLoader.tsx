import * as React from "react"

import { GlassRevealJ } from "@/components/ui/liquid-glass-logo-reveal"

/** Upper bound for the reveal when WebGL is missing or the logo never loads. */
const MAX_REVEAL_MS = 4500
/** Reduced motion shows a still frame, so keep the overlay brief. */
const REDUCED_MOTION_MS = 700
const SEEN_KEY = "loader-seen"

function dismissLoader() {
  document.documentElement.classList.remove("is-loading")
  try {
    sessionStorage.setItem(SEEN_KEY, "1")
  } catch {
    // Storage blocked: the loader simply plays again next visit.
  }
}

/**
 * Plays the glass "J" reveal over the page, then lifts once both the reveal and the page load are done.
 * The overlay itself is server-rendered in Layout so it covers the page before this island hydrates.
 */
export default function PageLoader() {
  const [active] = React.useState(() => document.documentElement.classList.contains("is-loading"))
  const finishReveal = React.useRef<() => void>(() => {})

  React.useEffect(() => {
    if (!active) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let cancelled = false
    let timer = 0

    const pageLoaded = new Promise<void>((resolve) => {
      if (document.readyState === "complete") resolve()
      else window.addEventListener("load", () => resolve(), { once: true })
    })
    const revealEnded = new Promise<void>((resolve) => {
      finishReveal.current = resolve
      timer = window.setTimeout(resolve, reduce ? REDUCED_MOTION_MS : MAX_REVEAL_MS)
    })

    Promise.all([pageLoaded, revealEnded]).then(() => {
      if (!cancelled) dismissLoader()
    })
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [active])

  if (!active) return null

  return (
    <GlassRevealJ
      className="size-full cursor-default"
      loop={false}
      tileSize={180}
      onRevealEnd={() => finishReveal.current()}
    />
  )
}
