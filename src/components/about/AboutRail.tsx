import * as React from "react"
import { useReducedMotion } from "motion/react"

import { TextSwapRoll } from "@/components/ui/text-swap-roll"

/*
 * The About page's shared title: it stays put beside the sections while they scroll past, and when the next section
 * arrives it rolls into that section's title, word by word like the footer's role line. Decorative: each section
 * keeps its own heading for assistive technology. Under reduced motion the words just swap.
 */

/** A section is current once its top has passed this share of the screen. */
const LINE = 0.45

export default function AboutRail({ sections }: { sections: { id: string; title: string }[] }) {
  const reduce = useReducedMotion()
  const [label, setLabel] = React.useState(sections[0].title)
  const [swap, setSwap] = React.useState<{ from: string; to: string; id: number } | null>(null)
  const current = React.useRef(label)

  React.useEffect(() => {
    let frame = 0
    const check = () => {
      frame = 0
      let title = sections[0].title
      for (const section of sections) {
        const element = document.querySelector(`[data-about-section="${section.id}"]`)
        if (element && element.getBoundingClientRect().top <= window.innerHeight * LINE) title = section.title
      }
      if (title === current.current) return
      const from = current.current
      current.current = title
      setLabel(title)
      setSwap(reduce ? null : (running) => ({ from: running?.to ?? from, to: title, id: (running?.id ?? 0) + 1 }))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    check()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [sections, reduce])

  return (
    <p
      data-about-rail
      data-title={label}
      aria-hidden="true"
      className="font-display text-[clamp(2rem,3.4vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em]"
    >
      {swap ? <TextSwapRoll key={swap.id} from={swap.from} to={swap.to} onAnimationComplete={() => setSwap(null)} /> : label}
    </p>
  )
}
