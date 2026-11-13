import * as React from "react"
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useIsPresent,
  useTransform,
  useVelocity,
} from "motion/react"

import type { LifePhoto } from "@/data/about"

/*
 * Off the clock's photos: over a side marked data-life-image, a photo of it rides beside the pointer, the way the
 * projects' cursor label does, but next to the arrow rather than in its place. It does not fade in. The photo is
 * uncovered from the bottom up by a wiping mask while it settles out of a slight zoom, and leaves by wiping on up
 * and away. Moving to another side wipes the new photo in over the old one, in the same upright 3:4 frame, square-cornered. The frame trails the pointer
 * on a spring and leans into its movement, as if it had a little weight. Mouse and pen only, so it never mounts on
 * touch screens; under reduced motion it follows exactly and appears and changes at once. Decorative: every side
 * already says in words what its photo shows.
 */

const FINE_POINTER = "(hover: hover) and (pointer: fine)"
const FOLLOW = { stiffness: 260, damping: 30, mass: 0.7 }
const EASE = [0.22, 1, 0.36, 1] as const
/** The one frame every photo shares, in px: an upright 3:4 rectangle. */
const FRAME = { width: 240, height: 320 }
/** Gap between the pointer and the frame, and from the frame to the screen's edge. */
const GAP = 28
const EDGE = 16

/** The photo the element under a point asks for, if any. */
function photoAt(element: Element | null) {
  return element?.closest<HTMLElement>("[data-life-image]")?.dataset.lifeImage || null
}

/** One photo, uncovered from the bottom up out of a slight zoom, and wiped on up and away when it leaves. */
function Photo({ photo, reduce }: { photo: LifePhoto; reduce: boolean }) {
  // Only the arriving photo is current: one on its way out keeps showing until its wipe is done.
  const present = useIsPresent()
  return (
    <motion.div
      data-life-photo
      data-current={present ? "" : undefined}
      className="absolute inset-0 overflow-hidden shadow-[0_24px_60px_rgb(0_0_0/0.45)]"
      initial={reduce ? false : { clipPath: "inset(100% 0% 0% 0%)" }}
      animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
      exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { clipPath: "inset(0% 0% 100% 0%)" }}
      transition={reduce ? { duration: 0 } : { duration: 0.7, ease: EASE }}
    >
      <motion.img
        src={photo.src}
        alt=""
        width={photo.width}
        height={photo.height}
        className="size-full object-cover"
        initial={reduce ? false : { scale: 1.25, y: "6%" }}
        animate={{ scale: 1, y: "0%" }}
        exit={reduce ? undefined : { scale: 1.1, y: "-4%" }}
        transition={reduce ? { duration: 0 } : { duration: 0.9, ease: EASE }}
      />
    </motion.div>
  )
}

export default function LifePreview({ photos }: { photos: LifePhoto[] }) {
  const reduce = useReducedMotion()
  const [fine, setFine] = React.useState(false)
  // `src` outlives a hide, so the frame keeps its shape while the last photo wipes away.
  const [src, setSrc] = React.useState<string | null>(null)
  const [visible, setVisible] = React.useState(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, FOLLOW)
  const springY = useSpring(y, FOLLOW)
  // Lean into the movement: a few degrees at most, eased back upright when the pointer rests.
  const lean = useSpring(useTransform(useVelocity(springX), [-2000, 0, 2000], [-7, 0, 7], { clamp: true }), {
    stiffness: 200,
    damping: 24,
  })

  const byPath = React.useMemo(() => new Map(photos.map((photo) => [photo.src, photo])), [photos])
  const current = src ? byPath.get(src) : undefined

  React.useEffect(() => {
    const query = window.matchMedia(FINE_POINTER)
    const update = () => setFine(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  React.useEffect(() => {
    if (!fine) return
    let shown = false
    let last = { x: -1, y: -1 }

    // Beside the pointer, to its right, or to its left near the right edge; centred on it and kept on screen.
    const place = (pointerX: number, pointerY: number, snap: boolean) => {
      const { width, height } = FRAME
      const right = pointerX + GAP + width <= window.innerWidth - EDGE
      const left = right ? pointerX + GAP : pointerX - GAP - width
      const top = Math.min(Math.max(pointerY - height / 2, EDGE), window.innerHeight - EDGE - height)
      if (snap) {
        // Appear where the pointer is, not fly in from wherever the frame was last.
        x.jump(left)
        y.jump(top)
        springX.jump(left)
        springY.jump(top)
      } else {
        x.set(left)
        y.set(top)
      }
    }
    const show = (path: string | null) => {
      if (path && byPath.has(path)) {
        if (!shown) place(last.x, last.y, true)
        setSrc(path)
        shown = true
      } else {
        shown = false
      }
      setVisible(shown)
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return
      last = { x: event.clientX, y: event.clientY }
      show(photoAt(event.target as Element))
      if (shown) place(last.x, last.y, false)
    }
    // The page can move under a resting pointer (scrolling): read again what sits there.
    const onScroll = () => {
      if (last.x >= 0) show(photoAt(document.elementFromPoint(last.x, last.y)))
    }
    const onLeave = (event: MouseEvent) => {
      if (!event.relatedTarget) show(null)
    }
    document.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("scroll", onScroll, { passive: true })
    document.addEventListener("mouseout", onLeave)
    return () => {
      document.removeEventListener("pointermove", onMove)
      window.removeEventListener("scroll", onScroll)
      document.removeEventListener("mouseout", onLeave)
    }
  }, [fine, byPath, x, y, springX, springY])

  if (!fine) return null

  return (
    <motion.div
      data-life-preview
      data-visible={visible}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[55]"
      style={{ x: reduce ? x : springX, y: reduce ? y : springY, rotate: reduce ? 0 : lean }}
    >
      <div data-life-frame className="relative overflow-hidden" style={FRAME}>
        <AnimatePresence initial={false}>
          {visible && current && (
            <Photo key={current.src} photo={current} reduce={Boolean(reduce)} />
          )}
        </AnimatePresence>
      </div>
      {/* Every photo loads with the section, so the first one is ready the first time the pointer arrives. */}
      <div hidden>
        {photos.map((photo) => (
          <img key={photo.src} src={photo.src} alt="" width={photo.width} height={photo.height} decoding="async" />
        ))}
      </div>
    </motion.div>
  )
}
