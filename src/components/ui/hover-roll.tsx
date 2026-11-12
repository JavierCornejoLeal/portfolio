import * as React from "react"
import { useReducedMotion } from "motion/react"

import { TextRoll } from "@/components/ui/text-roll"

/*
 * Hover roll: a word whose letters roll (TextRoll) each time the pointer reaches it or the keyboard focuses it.
 * Shared by the menu's and the footer's links. Screen readers get the plain word; under reduced motion it stays put.
 */

/** Call `play` from the link's pointer-enter and focus; pass `roll` to <HoverRollLabel>. */
export function useHoverRoll() {
  const reduce = useReducedMotion()
  const [roll, setRoll] = React.useState(0)
  const play = React.useCallback(() => {
    if (!reduce) setRoll((count) => count + 1)
  }, [reduce])
  return { roll, play }
}

export function HoverRollLabel({ label, roll }: { label: string; roll: number }) {
  if (roll === 0) return <>{label}</>
  return (
    <>
      <span className="sr-only">{label}</span>
      {/* Remounted on every hover, so it plays again. */}
      <span aria-hidden="true">
        <TextRoll
          key={roll}
          duration={0.35}
          getEnterDelay={(i) => i * 0.025}
          getExitDelay={(i) => i * 0.025 + 0.08}
          transition={{ ease: "easeOut" }}
        >
          {label}
        </TextRoll>
      </span>
    </>
  )
}
