import * as React from "react"
import { motion } from "motion/react"

/*
 * Text swap roll: TextRoll's split-flap letters, but the face that tips in is another text. Slot by slot, the
 * letter of `from` tips away while the letter of `to` tips in. Both faces share one grid cell, so a slot is as
 * wide as its wider letter while it rolls and nothing overlaps. It plays on mount; remount it to play again.
 */

/**
 * A lone space would collapse to nothing inside a grid cell. A missing letter (the shorter text's tail) gets a
 * zero-width space: an empty face has no baseline, so its slot would sit on its bottom edge and jolt the line.
 */
const glyph = (letter: string | undefined) => (letter === " " ? " " : (letter ?? "​"))

export function TextSwapRoll({
  from,
  to,
  duration = 0.35,
  stagger = 0.025,
  onAnimationComplete,
}: {
  from: string
  to: string
  duration?: number
  stagger?: number
  onAnimationComplete?: () => void
}) {
  const slots = Math.max(from.length, to.length)
  return (
    <span className="inline-block whitespace-nowrap">
      {Array.from({ length: slots }, (_, i) => (
        <span key={i} data-swap-letter className="inline-grid [perspective:10000px] [transform-style:preserve-3d]">
          <motion.span
            className="origin-[50%_25%] [grid-area:1/1] [backface-visibility:hidden]"
            initial={{ rotateX: 0 }}
            animate={{ rotateX: 90 }}
            transition={{ ease: "easeOut", duration, delay: i * stagger }}
          >
            {glyph(from[i])}
          </motion.span>
          <motion.span
            className="origin-[50%_100%] [grid-area:1/1] [backface-visibility:hidden]"
            initial={{ rotateX: 90 }}
            animate={{ rotateX: 0 }}
            transition={{ ease: "easeOut", duration, delay: i * stagger + 0.08 }}
            onAnimationComplete={i === slots - 1 ? onAnimationComplete : undefined}
          >
            {glyph(to[i])}
          </motion.span>
        </span>
      ))}
    </span>
  )
}
