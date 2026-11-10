import * as React from "react"
import { motion, type TargetAndTransition, type Transition } from "motion/react"

import { cn } from "@/lib/utils"

/*
 * Text roll, after the motion-primitives API. Each letter is two faces: the first tips away (rotateX 0 → 90)
 * while the second tips in behind it (90 → 0), letter by letter, like a split-flap sign. It plays on mount;
 * remount it (change its key) to play it again.
 */

type RollVariants = {
  enter: { initial: TargetAndTransition; animate: TargetAndTransition }
  exit: { initial: TargetAndTransition; animate: TargetAndTransition }
}

const defaultVariants: RollVariants = {
  enter: { initial: { rotateX: 0 }, animate: { rotateX: 90 } },
  exit: { initial: { rotateX: 90 }, animate: { rotateX: 0 } }
}

export function TextRoll({
  children,
  duration = 0.5,
  getEnterDelay = (i) => i * 0.1,
  getExitDelay = (i) => i * 0.1 + 0.2,
  className,
  transition = { ease: "easeIn" },
  variants,
  onAnimationComplete
}: {
  children: string
  duration?: number
  getEnterDelay?: (index: number) => number
  getExitDelay?: (index: number) => number
  className?: string
  transition?: Transition
  variants?: RollVariants
  onAnimationComplete?: () => void
}) {
  const faces = variants ?? defaultVariants
  // Letters roll on their own, but each word stays one unbreakable group so a line never splits a word.
  const words = children.split(" ")
  const total = children.replaceAll(" ", "").length
  let index = 0

  return (
    <span className={className}>
      {words.map((word, w) => (
        <React.Fragment key={w}>
          {w > 0 && " "}
          <span className="inline-block whitespace-nowrap">
            {word.split("").map((letter) => {
              const i = index++
              return (
                <span key={i} data-roll-letter className="relative inline-block [perspective:10000px] [transform-style:preserve-3d]" aria-hidden="true">
                  <motion.span
                    className="absolute inset-0 inline-block origin-[50%_25%] [backface-visibility:hidden]"
                    initial={faces.enter.initial}
                    animate={faces.enter.animate}
                    transition={{ ...transition, duration, delay: getEnterDelay(i) }}
                  >
                    {letter}
                  </motion.span>
                  <motion.span
                    className="absolute inset-0 inline-block origin-[50%_100%] [backface-visibility:hidden]"
                    initial={faces.exit.initial}
                    animate={faces.exit.animate}
                    transition={{ ...transition, duration, delay: getExitDelay(i) }}
                    onAnimationComplete={i === total - 1 ? onAnimationComplete : undefined}
                  >
                    {letter}
                  </motion.span>
                  <span className="invisible">{letter}</span>
                </span>
              )
            })}
          </span>
        </React.Fragment>
      ))}
      <span className="sr-only">{children}</span>
    </span>
  )
}
