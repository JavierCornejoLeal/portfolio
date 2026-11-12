import * as React from "react"
import { useInView, useReducedMotion } from "motion/react"

import { TextRoll } from "@/components/ui/text-roll"
import { cn } from "@/lib/utils"

/**
 * A section heading that rolls in letter by letter (TextRoll) when it scrolls into view, and again on hover.
 * Screen readers get the plain text; under reduced motion it is plain text for everyone.
 */
export function RollingTitle({ text, id, className }: { text: string; id?: string; className?: string }) {
  const ref = React.useRef<HTMLHeadingElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduced = useReducedMotion()
  const [replay, setReplay] = React.useState(0)
  const rolling = React.useRef(false)

  const visual = reduced ? (
    text
  ) : inView ? (
    <TextRoll
      key={replay}
      duration={0.35}
      getEnterDelay={(i) => i * 0.035}
      getExitDelay={(i) => i * 0.035 + 0.15}
      onAnimationComplete={() => (rolling.current = false)}
    >
      {text}
    </TextRoll>
  ) : (
    <span className="invisible">{text}</span>
  )

  return (
    <h2
      ref={ref}
      id={id}
      onPointerEnter={() => {
        if (reduced || !inView || rolling.current) return
        rolling.current = true
        setReplay((n) => n + 1)
      }}
      className={cn("font-display text-4xl font-semibold tracking-[-0.03em] text-ink sm:text-6xl lg:text-7xl", className)}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{visual}</span>
    </h2>
  )
}
