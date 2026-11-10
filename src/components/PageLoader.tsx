import * as React from "react"

import { GlassRevealJ } from "@/components/ui/liquid-glass-logo-reveal"

/** Upper bound for the reveal when WebGL is missing or slow, or the logo never loads. */
const MAX_REVEAL_MS = 4500
/** Reduced motion shows a still frame, so keep the overlay brief. */
const REDUCED_MOTION_MS = 700
/** Matches the overlay fade in global.css; the reveal unmounts once it is out of sight. */
const FADE_MS = 600
const SEEN_KEY = "loader-seen"

function liftOverlay() {
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
  const [active, setActive] = React.useState(() => document.documentElement.classList.contains("is-loading"))
  const finishReveal = React.useRef<() => void>(() => {})

  React.useEffect(() => {
    if (!active) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let cancelled = false
    let capTimer = 0
    let unmountTimer = 0

    const pageLoaded = new Promise<void>((resolve) => {
      if (document.readyState === "complete") resolve()
      else window.addEventListener("load", () => resolve(), { once: true })
    })
    const revealEnded = new Promise<void>((resolve) => {
      finishReveal.current = resolve
      capTimer = window.setTimeout(resolve, reduce ? REDUCED_MOTION_MS : MAX_REVEAL_MS)
    })

    Promise.all([pageLoaded, revealEnded]).then(() => {
      if (cancelled) return
      liftOverlay()
      // Dispose the WebGL engine once the fade has finished, so nothing keeps drawing off-screen.
      unmountTimer = window.setTimeout(() => setActive(false), FADE_MS)
    })
    return () => {
      cancelled = true
      window.clearTimeout(capTimer)
      window.clearTimeout(unmountTimer)
    }
  }, [active])

  if (!active) return null

  // The canvas only needs room for the tile and its ripple, not the whole screen: the overlay paints
  // the rest. tileSize × 2 keeps the full 180 px tile (the engine fits it into min(w, h) / 1.75).
  return (
    <GlassRevealJ
      className="size-[min(360px,100vw)] cursor-default"
      loop={false}
      tileSize={180}
      onRevealEnd={() => finishReveal.current()}
    />
  )
}
