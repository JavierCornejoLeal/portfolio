import * as React from "react"
import { motion } from "motion/react"

/*
 * Text swap roll: TextRoll's split-flap letters, but the face that tips in is another text. The texts are paired
 * word by word: in each word, the old letters tip away (rotateX 0 → 90) while the new ones tip in (90 → 0), one
 * after another across the whole line. Each word keeps its own letters together, set as they are, and its width
 * moves in step with them (see Word), so a longer or shorter word never overlaps or pulls apart the next one.
 * It plays on mount; remount it to play again.
 */

interface Timing {
  duration: number
  stagger: number
  /** How long the whole line takes. */
  total: number
}

function Face({ text, first, timing, out }: { text: string; first: number; timing: Timing; out: boolean }) {
  return (
    <span className="absolute top-0 left-0 whitespace-nowrap">
      {text.split("").map((letter, i) => (
        <motion.span
          key={i}
          className={`inline-block [backface-visibility:hidden] ${out ? "origin-[50%_25%]" : "origin-[50%_100%]"}`}
          initial={{ rotateX: out ? 0 : 90 }}
          animate={{ rotateX: out ? 90 : 0 }}
          transition={{ ease: "easeOut", duration: timing.duration, delay: (first + i) * timing.stagger + (out ? 0 : 0.08) }}
        >
          {letter}
        </motion.span>
      ))}
    </span>
  )
}

function Word({
  from,
  to,
  first,
  timing,
}: {
  from: string
  to: string
  first: number
  timing: Timing
}) {
  const fromRef = React.useRef<HTMLSpanElement>(null)
  const toRef = React.useRef<HTMLSpanElement>(null)
  const [widths, setWidths] = React.useState<[number, number] | null>(null)
  // Measured before the first paint, so the word starts exactly as wide as the old one.
  React.useLayoutEffect(() => {
    setWidths([fromRef.current!.getBoundingClientRect().width, toRef.current!.getBoundingClientRect().width])
  }, [])

  // The word makes room for whichever letters are showing. Growing (stack → creative), it widens once the new letters
  // pass the old word's end, as they tip in; shrinking, it holds until its last old letter has tipped away,
  // then closes up. Either way no letters overlap the next word, and no gap opens before it.
  const grows = widths ? widths[1] >= widths[0] : true
  const transition = grows
    ? {
        // From the new letter at the old word's end, a step ahead of the letters that tip in past it.
        ease: "easeOut" as const,
        delay: (first + from.length - 1) * timing.stagger + 0.08,
        duration: (to.length - from.length + 1) * timing.stagger + 0.08,
      }
    : { ease: "easeInOut" as const, duration: 0.25, delay: (first + from.length - 1) * timing.stagger + timing.duration * 0.6 }

  return (
    <motion.span
      data-swap-word
      className="relative inline-block whitespace-nowrap align-baseline [perspective:10000px] [transform-style:preserve-3d]"
      style={widths ? { width: widths[0] } : undefined}
      animate={widths ? { width: widths[1] } : undefined}
      transition={transition}
    >
      {/* Invisible sizers: the new word gives the line its baseline; both are measured for the glide. */}
      <span ref={toRef} className="invisible">
        {to || "​"}
      </span>
      <span ref={fromRef} aria-hidden="true" className="invisible absolute top-0 left-0">
        {from}
      </span>
      <Face text={from} first={first} timing={timing} out />
      <Face text={to} first={first} timing={timing} out={false} />
    </motion.span>
  )
}

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
  const fromWords = from.split(" ")
  const toWords = to.split(" ")
  const count = Math.max(fromWords.length, toWords.length)
  const pairs = Array.from({ length: count }, (_, i) => [fromWords[i] ?? "", toWords[i] ?? ""] as const)
  // Letters roll in one sweep along the line: each word starts where the longer of its two texts left off.
  const firsts: number[] = []
  let letters = 0
  for (const [a, b] of pairs) {
    firsts.push(letters)
    letters += Math.max(a.length, b.length)
  }
  const timing: Timing = { duration, stagger, total: Math.max(0, letters - 1) * stagger + 0.08 + duration }

  // Done once the last letter has tipped in. A timer, not Motion's callback: a word whose width does not change
  // (developer → developer) finishes without one.
  const done = React.useRef(onAnimationComplete)
  done.current = onAnimationComplete
  React.useEffect(() => {
    const timer = window.setTimeout(() => done.current?.(), timing.total * 1000)
    return () => window.clearTimeout(timer)
  }, [timing.total])

  return (
    <span className="inline-block whitespace-nowrap">
      {pairs.map(([a, b], i) => (
        <React.Fragment key={i}>
          {i > 0 && " "}
          <Word from={a} to={b} first={firsts[i]} timing={timing} />
        </React.Fragment>
      ))}
    </span>
  )
}
