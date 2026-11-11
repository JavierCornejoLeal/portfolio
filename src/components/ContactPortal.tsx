import * as React from "react"

import GlyphPortal from "@/components/ui/glyph-portal"
import { GlassCta } from "@/components/ui/glass-cta"

/*
 * Contact: a quiet HELLO in Anton. Scrolling carries a camera into one of its letters until a near-black green
 * fills the screen; that green is where the footer will live (#contact-inside). Above the word sits one
 * line, below it a liquid-glass Let's talk that glides into the green.
 */

const FONT = '"Anton"'

/** The green behind the letters: a near-black green, dark enough to stay quiet while HELLO still reads, and the
 *  ground the footer will land on. */
function Field() {
  return (
    <div
      className="absolute inset-0"
      style={{
        transform: "scale(var(--gp-field-scale, 1))",
        background: "linear-gradient(135deg, #031f02 0%, #052a03 50%, #031f02 100%)",
      }}
    />
  )
}

function Front() {
  return (
    <>
      <p
        data-contact-eyebrow
        className="absolute inset-x-6 text-center font-display text-sm font-medium tracking-[0.08em] text-ink-muted uppercase sm:text-base"
        style={{ bottom: "calc(100% - var(--gp-word-top, 35%) + 2rem)" }}
      >
        Got something worth building?
      </p>
      <div className="absolute inset-x-6 flex justify-center" style={{ top: "calc(var(--gp-word-bottom, 60%) + 2.5rem)" }}>
        <GlassCta href="#contact-inside">Let's talk</GlassCta>
      </div>
    </>
  )
}

export default function ContactPortal() {
  // The portal freezes its face on mount, so mount it only once Anton is ready; a late swap would move the ink
  // out from under the camera.
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    let live = true
    const done = () => live && setReady(true)
    document.fonts.load(`400 100px ${FONT}`, "HELLO").then(done, done)
    return () => {
      live = false
    }
  }, [])

  if (!ready) return <div className="min-h-svh" aria-hidden="true" />

  return (
    <GlyphPortal
      word="HELLO"
      interactive={false}
      fontFamily={FONT}
      fontWeight={400}
      scrollLength={2.4}
      background={<Field />}
      front={<Front />}
      style={{
        // The portal defaults its section to Arial; keep the site's reading face for what sits inside it.
        fontFamily: "var(--font-sans)",
        "--gp-paper": "transparent",
        "--gp-ink": "var(--color-ink)",
        "--gp-field": "#052a03",
        "--gp-foreground": "var(--color-ink)",
      }}
    >
      {/* The footer lands here, in the green the camera opens onto. */}
      <div id="contact-inside" data-contact-inside />
    </GlyphPortal>
  )
}
