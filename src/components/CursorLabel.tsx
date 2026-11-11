import * as React from "react"
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react"

/*
 * Cursor label: over anything marked data-cursor="…", a small dark box takes the arrow's place and says what a click
 * does there ("View project", "Previous", "Next"). It inverts whatever sits behind it (a difference blend), trails
 * the pointer a touch, wipes in from the left and swaps its words in place. Anywhere else the normal cursor stays. Mouse and pen only: with no
 * hovering pointer there is nothing to follow, so it never mounts on touch screens. Decorative (aria-hidden): what it
 * says is already in the page for assistive technology.
 */

const FINE_POINTER = "(hover: hover) and (pointer: fine)"
const SPRING = { stiffness: 520, damping: 42, mass: 0.6 }

/** What the element under a point asks the label to say, if anything. */
function intentAt(element: Element | null) {
  return element?.closest<HTMLElement>("[data-cursor]")?.dataset.cursor || null
}

export default function CursorLabel() {
  const reduce = useReducedMotion()
  const [fine, setFine] = React.useState(false)
  // `text` is what shows; it outlives a hide so the box can wipe out with its words still on it.
  const [text, setText] = React.useState("")
  const [visible, setVisible] = React.useState(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, SPRING)
  const springY = useSpring(y, SPRING)

  React.useEffect(() => {
    const query = window.matchMedia(FINE_POINTER)
    const update = () => setFine(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  React.useEffect(() => {
    if (!fine) return
    // Lets the page hide the arrow over labelled elements only while this label is there to replace it.
    const html = document.documentElement
    html.dataset.cursorReady = ""
    let shown = false
    let last = { x: -1, y: -1 }

    const show = (intent: string | null) => {
      if (intent) {
        if (!shown) {
          // Appear where the pointer is, not fly in from wherever the box was last.
          x.jump(last.x)
          y.jump(last.y)
          springX.jump(last.x)
          springY.jump(last.y)
        }
        setText(intent)
      }
      shown = Boolean(intent)
      setVisible(shown)
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return
      last = { x: event.clientX, y: event.clientY }
      show(intentAt(event.target as Element))
      // Hidden, it only remembers where the pointer is: no animation work anywhere the label has nothing to say.
      if (!shown) return
      x.set(event.clientX)
      y.set(event.clientY)
    }
    // The page can move under a resting pointer (scrolling): read again what sits there.
    const onScroll = () => {
      if (last.x >= 0) show(intentAt(document.elementFromPoint(last.x, last.y)))
    }
    const onLeave = (event: MouseEvent) => {
      if (!event.relatedTarget) show(null)
    }
    document.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("scroll", onScroll, { passive: true })
    document.addEventListener("mouseout", onLeave)
    return () => {
      delete html.dataset.cursorReady
      document.removeEventListener("pointermove", onMove)
      window.removeEventListener("scroll", onScroll)
      document.removeEventListener("mouseout", onLeave)
    }
  }, [fine, x, y, springX, springY])

  if (!fine) return null

  return (
    <motion.div
      data-cursor-label
      data-visible={visible}
      aria-hidden="true"
      // White box, black words, blended by difference: it inverts whatever sits behind it, so it shifts with every
      // colour it crosses (white over black, the complement over a colour), and its words show the backdrop itself.
      className="pointer-events-none fixed top-0 left-0 z-[60] mix-blend-difference"
      style={{ x: reduce ? x : springX, y: reduce ? y : springY }}
    >
      <div className="cursor-box relative overflow-hidden bg-white px-6 py-3 font-display text-xs leading-none font-medium tracking-[0.14em] whitespace-nowrap text-black uppercase">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={text}
            className="relative block"
            initial={reduce ? false : { y: "110%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { y: "-110%", opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
